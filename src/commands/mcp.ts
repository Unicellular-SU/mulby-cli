import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import chalk from 'chalk'
import { spawn, ChildProcess } from 'child_process'
import { resolveMulbyExec, resolveSpawnCwd } from '../services/app-locator'

interface McpOptions {
  appPath?: string
  main?: string
  port?: string
  token?: string
}

interface McpInfo {
  url: string
  userData?: string | null
  token?: string | null
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function waitForInfo(file: string, child: ChildProcess, timeoutMs: number): Promise<McpInfo> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`Mulby 进程提前退出 (code=${child.exitCode})`)
    if (fs.existsSync(file)) {
      try {
        const info = fs.readJsonSync(file)
        if (info && typeof info.url === 'string' && info.url.startsWith('http')) return info
      } catch {
        /* 文件可能还在写，重试 */
      }
    }
    await sleep(200)
  }
  throw new Error('等待 MCP 地址超时')
}

/**
 * 启动插件验证 MCP server（Mulby 的 MULBY_VERIFY_MCP 模式，Streamable HTTP），打印连接地址与 AI IDE 配置，
 * 保持前台运行直到 Ctrl+C。供 AI（Claude Code / Cursor 等）边改插件边驱动 Mulby 检查。
 */
export async function mcp(options: McpOptions): Promise<void> {
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
  const portFile = path.join(os.tmpdir(), `mulby-mcp-url-${process.pid}.json`)
  try {
    fs.removeSync(portFile)
  } catch {
    /* ignore */
  }

  console.log(chalk.blue('启动 Mulby 插件验证 MCP server...'))

  const child = spawn(appExec, args, {
    cwd,
    env: {
      ...process.env,
      MULBY_VERIFY_MCP: '1',
      MULBY_VERIFY_MCP_PORTFILE: portFile,
      ...(options.port ? { MULBY_VERIFY_MCP_PORT: String(options.port) } : {}),
      ...(options.token ? { MULBY_VERIFY_MCP_TOKEN: options.token } : {})
    },
    stdio: ['ignore', 'inherit', 'inherit']
  })

  const stop = (): void => {
    try {
      child.kill()
    } catch {
      /* ignore */
    }
    try {
      fs.removeSync(portFile)
    } catch {
      /* ignore */
    }
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  child.on('exit', (code) => {
    try {
      fs.removeSync(portFile)
    } catch {
      /* ignore */
    }
    process.exit(code ?? 0)
  })

  let info: McpInfo
  try {
    info = await waitForInfo(portFile, child, 30000)
  } catch (err) {
    console.log(chalk.red(`MCP server 启动失败: ${err instanceof Error ? err.message : String(err)}`))
    stop()
    return
  }

  const mcpEntry: Record<string, unknown> = { url: info.url }
  if (info.token) mcpEntry.headers = { Authorization: `Bearer ${info.token}` }

  console.log()
  console.log(chalk.green('✓ MCP server 已就绪'))
  console.log(`${chalk.bold('  URL:   ')}${info.url}`)
  if (info.token) console.log(`${chalk.bold('  Token: ')}${info.token}`)
  console.log()
  console.log(chalk.gray('  AI IDE（Streamable HTTP）配置：'))
  console.log(chalk.gray(JSON.stringify({ mcpServers: { 'mulby-verify': mcpEntry } }, null, 2)))
  console.log()
  console.log(chalk.gray('  按 Ctrl+C 停止。'))
}
