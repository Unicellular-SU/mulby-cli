export function buildBasicManifest(name: string) {
  return {
    $schema: './node_modules/.mulby/manifest-schema.json',
    id: name,
    name,
    version: '1.0.0',
    displayName: name,
    author: 'mulby',
    description: 'Plugin description',
    main: 'dist/main.js',
    icon: 'icon.png',
    permissions: {
      clipboard: true,
      notification: true
    },
    features: [
      {
        code: 'main',
        explain: 'Main feature',
        cmds: [{ type: 'keyword', value: name }]
      }
    ]
  }
}

export function buildBasicTsConfig() {
  return {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: './dist',
      rootDir: './src'
    },
    include: ['src']
  }
}

export function buildBasicPackageJson(name: string) {
  return {
    name,
    version: '1.0.0',
    packageManager: 'pnpm@9.1.0',
    scripts: {
      build: 'esbuild src/main.ts --bundle --platform=node --outfile=dist/main.js',
      // esbuild 只转译不查类型；用它做类型检查（CI / 提交前 / AI 自检都会跑）
      typecheck: 'tsc --noEmit',
      dev: 'mulby dev',
      pack: 'mulby pack'
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      esbuild: '^0.20.0',
      typescript: '^5.0.0'
    }
  }
}

export function buildBasicMain(name: string) {
  return `/// <reference path="./types/mulby.d.ts" />
// 运行时由 Mulby 宿主注入全局 API 代理（无需从参数中获取）
declare const mulby: any

export function onLoad() {
  // Register background subscriptions or plugin tools here when needed.
}

export function onUnload() {
  // Clean up subscriptions, timers, or external resources here.
}

export function onEnable() {
  // Called when the plugin is enabled.
}

export function onDisable() {
  // Called when the plugin is disabled.
}

export async function run(context: BackendPluginContext) {
  const text = context.input || await mulby.clipboard.readText()
  const result = text.toUpperCase()

  await mulby.clipboard.writeText(result)
  mulby.notification.show('Done')
}

const plugin = { onLoad, onUnload, onEnable, onDisable, run }
export default plugin
`
}

export function buildGitignore() {
  return `node_modules
dist
.DS_Store
*.log
`
}

export function buildBasicReadme(name: string) {
  return `# ${name}

Plugin description

## Features

- Feature 1
- Feature 2
- Feature 3

## Trigger

- \`${name}\` - main feature

## Command execution permission

The default template does not enable command execution. Add \`commandExecution.direct\` to \`manifest.json\` only when backend code actually calls \`context.api.shell.runCommand\` or the global \`mulby.shell.runCommand\`:

\`\`\`json
{
  "permissions": {
    "commandExecution": {
      "direct": {
        "enabled": true,
        "defaultProfile": "workspace",
        "maxProfile": "workspace"
      }
    }
  }
}
\`\`\`

Each command can request \`executionProfile: "sandbox" | "workspace" | "trusted"\`, but the request cannot exceed the manifest \`maxProfile\`. If this plugin hosts its own AI and wants that AI to use Mulby's command-backed capabilities, declare \`commandExecution.ai\` separately. Legacy \`runCommand: true\` only authorizes direct plugin commands and does not authorize AI-generated commands.

## Directory access

Plugins can request user-approved directory access at runtime. This does not require a manifest declaration. A \`readwrite\` grant expands the command workspace roots for this plugin, but command execution still requires \`commandExecution.direct\` or \`commandExecution.ai\`.

\`\`\`ts
const grant = await context.api.directoryAccess.request({
  mode: 'readwrite',
  reason: 'Run commands in the selected project directory'
})

if (grant) {
  await context.api.shell.runCommand({
    command: 'git',
    args: ['status'],
    cwd: grant.path,
    executionProfile: 'workspace'
  })
}
\`\`\`

## Messaging subscriptions

For plugin-to-plugin messaging, keep subscriptions in the backend and expose cached data to the UI through \`rpc\` methods. If the plugin must receive messages while no UI is open, set \`manifest.pluginSetting.background = true\` and register the same handler from \`onBackground(context)\`. Whether it follows Mulby startup is controlled by the user from the plugin window menu or the search-result context menu.

\`\`\`ts
let messageHandler: ((message: PluginMessage) => void | Promise<void>) | null = null
const recentMessages: PluginMessage[] = []

function registerMessaging(api: BackendPluginAPI) {
  if (messageHandler) api.messaging.off(messageHandler)
  messageHandler = (message) => {
    recentMessages.unshift(message)
    recentMessages.splice(50)
  }
  api.messaging.on(messageHandler)
}

export function onLoad(context?: BackendPluginContext) {
  if (context) registerMessaging(context.api)
}

export function onBackground(context?: BackendPluginContext) {
  if (context) registerMessaging(context.api)
}

export const rpc = {
  getRecentMessages() {
    return recentMessages
  }
}
\`\`\`

## Development

> **💡 提示**: 推荐使用 [pnpm](https://pnpm.io/) 进行依赖管理。若插件放置于基于 pnpm workspace 的父仓库（如 \`plugins/<name>/\` 目录），通常建议直接在**仓库根目录**执行一次 \`pnpm install\`。也可以在当前插件目录单独执行。

### Install dependencies

\`\`\`bash
pnpm install
\`\`\`

### Start development mode

\`\`\`bash
pnpm run dev
\`\`\`

### Build

\`\`\`bash
pnpm run build
\`\`\`

### Package

\`\`\`bash
pnpm run pack
\`\`\`

## Packaging extra resources

The CLI automatically packages \`dist/main.js\`, \`icon.png\`, \`ui/\` when present, and \`manifest.preload\` when configured. Extra runtime files must be listed in \`manifest.assets\`.

Use \`assets\` for additional HTML files, child-window preload files, native \`.node\` addons, external binaries, locale files, or any resource loaded by path at runtime:

\`\`\`json
{
  "assets": [
    "region",
    "countdown.html",
    "region/preload.cjs",
    "addon-darwin-arm64.node",
    "bin/tool"
  ]
}
\`\`\`

When migrating zTools/uTools-style plugins, child windows can load plugin-local HTML files with \`window.mulby.window.create(path, { loadMode: "file", preload })\`. New plugins should usually prefer a single \`ui/index.html\` entry and frontend routing.

## Project structure

\`\`\`
${name}/
|-- manifest.json
|-- package.json
|-- src/
|   |-- main.ts
|   |-- types/
|       |-- mulby.d.ts
|-- dist/
|-- icon.png
\`\`\`

## License

MIT License
`
}
