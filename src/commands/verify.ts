import * as fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import { spawn } from 'child_process'
import { resolveMulbyExec, resolveSpawnCwd } from '../services/app-locator'

// 与主仓库 src/shared/types/plugin-verify.ts 的标记保持一致
const REPORT_BEGIN = '<<<MULBY_VERIFY_REPORT_BEGIN>>>'
const REPORT_END = '<<<MULBY_VERIFY_REPORT_END>>>'

interface VerifyOptions {
  json?: boolean
  strict?: boolean
  appPath?: string
  main?: string
  timeout?: string
  keepUserdata?: boolean
}

type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip'
interface VerifyCheck {
  id: string
  title: string
  status: CheckStatus
  detail?: string
}
interface VerifyReport {
  ok: boolean
  verdict: string
  plugin: { id: string; name: string; displayName?: string; version?: string; path: string }
  checks: VerifyCheck[]
  logs?: Array<{ source: string; level: string; text: string }>
  errors?: string[]
  durationMs?: number
  meta?: { userDataDir?: string }
}

const SYMBOL: Record<CheckStatus, string> = { pass: '✓', fail: '✗', warn: '⚠', skip: '·' }
const COLOR: Record<CheckStatus, (s: string) => string> = {
  pass: chalk.green,
  fail: chalk.red,
  warn: chalk.yellow,
  skip: chalk.gray
}

/**
 * 用 Mulby 验证插件：把目标插件目录交给 Mulby 的「验证模式」（环境变量 MULBY_VERIFY_PLUGIN），
 * 加载 → 触发匹配 → 执行 → UI 渲染冒烟，解析 stdout 中标记包裹的 JSON 报告并展示，按结果设退出码。
 */
export async function verify(pluginDir: string | undefined, options: VerifyOptions): Promise<void> {
  const dir = path.resolve(process.cwd(), pluginDir || '.')
  if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
    console.log(chalk.red(`错误: 未找到 manifest.json (${dir})`))
    process.exit(2)
  }

  const appExec = resolveMulbyExec(options)
  if (!appExec) {
    console.log(chalk.red('错误: 未找到 Mulby 可执行文件。'))
    console.log(
      chalk.gray('  请用 --app-path 指定，或运行 `mulby config set appPath <Mulby 可执行文件>`，或设置环境变量 MULBY_APP_PATH。')
    )
    process.exit(2)
  }

  const args = options.main ? [options.main] : []
  const cwd = resolveSpawnCwd(appExec, options.main)
  const timeoutMs = Number(options.timeout) || 60000

  if (!options.json) {
    console.log(chalk.blue(`验证插件: ${dir}`))
    console.log(chalk.gray(`  Mulby: ${appExec}${options.main ? ' ' + options.main : ''}`))
    console.log()
  }

  const child = spawn(appExec, args, {
    cwd,
    env: {
      ...process.env,
      MULBY_VERIFY_PLUGIN: dir,
      ...(options.strict ? { MULBY_VERIFY_STRICT: '1' } : {}),
      ...(options.keepUserdata ? { MULBY_VERIFY_KEEP_USERDATA: '1' } : {})
    }
  })

  let stdout = ''
  let stderr = ''
  child.stdout?.on('data', (d) => {
    stdout += d.toString()
  })
  child.stderr?.on('data', (d) => {
    stderr += d.toString()
  })

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    try {
      child.kill('SIGKILL')
    } catch {
      /* ignore */
    }
  }, timeoutMs)

  const code: number = await new Promise((resolve) => {
    child.on('exit', (c) => resolve(c ?? 1))
    child.on('error', (err) => {
      console.log(chalk.red(`无法启动 Mulby: ${err.message}`))
      resolve(1)
    })
  })
  clearTimeout(timer)

  const report = extractReport(stdout)
  if (!report) {
    console.log(chalk.red(timedOut ? `验证超时 (${timeoutMs}ms)，未取得报告。` : '未能从输出中解析验证报告。'))
    if (stderr.trim()) {
      console.log(chalk.gray(stderr.trim().split('\n').slice(-15).join('\n')))
    }
    process.exit(code !== 0 ? code : 1)
  }

  // 兜底清理隔离的临时 userData（引擎正常退出时已自行清理；此处兜底处理超时强杀等情况）
  if (report.meta?.userDataDir && !options.keepUserdata) {
    try {
      fs.removeSync(report.meta.userDataDir)
    } catch {
      /* ignore */
    }
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printReport(report)
  }
  process.exit(report.ok ? 0 : 1)
}

function extractReport(text: string): VerifyReport | null {
  const begin = text.lastIndexOf(REPORT_BEGIN)
  const end = text.lastIndexOf(REPORT_END)
  if (begin === -1 || end === -1 || end < begin) return null
  try {
    return JSON.parse(text.slice(begin + REPORT_BEGIN.length, end).trim()) as VerifyReport
  } catch {
    return null
  }
}

function printReport(report: VerifyReport): void {
  const p = report.plugin || ({} as VerifyReport['plugin'])
  console.log(chalk.bold(`Mulby 插件验证 · ${p.displayName || p.name || p.id || '(unknown)'}`))
  if (p.version || p.path) {
    console.log(chalk.gray(`  ${p.version ? 'v' + p.version + '  ·  ' : ''}${p.path || ''}`))
  }
  console.log()
  for (const c of report.checks || []) {
    const paint = COLOR[c.status] || ((s: string) => s)
    const sym = paint(SYMBOL[c.status] || '?')
    console.log(`  ${sym} ${c.title}${c.detail ? chalk.gray(` — ${c.detail}`) : ''}`)
  }
  const errLogs = (report.logs || []).filter((l) => l.level === 'error')
  if (errLogs.length) {
    console.log()
    console.log(chalk.yellow('插件错误输出:'))
    for (const l of errLogs.slice(0, 20)) console.log(chalk.gray(`  [${l.source}] ${l.text}`))
  }
  if (report.errors && report.errors.length) {
    console.log()
    console.log(chalk.red('致命错误:'))
    for (const e of report.errors) console.log(chalk.red(`  • ${e}`))
  }
  console.log()
  const verdict = report.ok ? chalk.green('✓ 通过') : chalk.red('✗ 未通过')
  console.log(`${chalk.bold('结果:')} ${verdict}  ${chalk.gray(`(${report.durationMs ?? '?'}ms)`)}`)
}
