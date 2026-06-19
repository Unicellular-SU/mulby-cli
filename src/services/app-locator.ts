import * as fs from 'fs-extra'
import * as path from 'path'
import { ConfigManager } from './config-manager'

export interface AppLocatorOptions {
  appPath?: string
}

/**
 * 解析 Mulby 可执行文件路径：
 * --app-path > 环境变量 MULBY_APP_PATH > 配置 appPath（mulby config set appPath ...）> 各平台默认安装位置。
 * 显式 --app-path / 环境变量不校验存在性（交给 spawn 报错），其余只返回实际存在的路径。
 */
export function resolveMulbyExec(options: AppLocatorOptions): string | null {
  if (options.appPath) return options.appPath
  if (process.env.MULBY_APP_PATH) return process.env.MULBY_APP_PATH
  try {
    const cfg = ConfigManager.getInstance().get<string>('appPath')
    if (cfg) return cfg
  } catch {
    /* ignore */
  }
  for (const candidate of defaultInstallPaths()) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return null
}

function defaultInstallPaths(): string[] {
  const platform = process.platform
  if (platform === 'win32') {
    const local = process.env.LOCALAPPDATA || ''
    const pf = process.env.ProgramFiles || ''
    const pf86 = process.env['ProgramFiles(x86)'] || ''
    return [
      local && path.join(local, 'Programs', 'Mulby', 'Mulby.exe'),
      pf && path.join(pf, 'Mulby', 'Mulby.exe'),
      pf86 && path.join(pf86, 'Mulby', 'Mulby.exe')
    ].filter((p): p is string => Boolean(p))
  }
  if (platform === 'darwin') {
    return ['/Applications/Mulby.app/Contents/MacOS/Mulby']
  }
  return ['/usr/bin/mulby', '/usr/local/bin/mulby', '/opt/Mulby/mulby']
}

/**
 * spawn 的 cwd：用 electron + 主进程入口（开发场景，传了 --main）时取仓库根目录（dist/main → 根），
 * 否则取可执行文件所在目录。保证 host/search worker 路径能被解析到。
 */
export function resolveSpawnCwd(appExec: string, mainEntry?: string): string {
  if (mainEntry) return path.resolve(path.dirname(mainEntry), '..', '..')
  return path.dirname(appExec)
}
