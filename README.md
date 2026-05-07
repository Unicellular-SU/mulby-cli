# Mulby CLI

Mulby 插件开发命令行工具，用来创建、调试、构建、打包，以及通过 AI 辅助开发插件。

## 功能概览

- 快速创建 `react` 或 `basic` 模板插件
- 开发模式下自动重建，React 模板支持 Vite UI 开发
- 构建并打包为 `.inplugin`
- `mulby create --ai` 支持 AI 辅助生成和迭代插件
- AI 开发内置两个 skill:
  - `develop-mulby-plugin`
  - `generate-electron-icons`

## 安装

```bash
npm install -g mulby-cli
```

也可以在插件项目里作为开发依赖安装：

```bash
pnpm add -D mulby-cli
```

## 快速开始

### 手动开发

```bash
mulby create my-plugin
cd my-plugin
pnpm install
pnpm run dev
```

开发完成后：

```bash
pnpm run build
pnpm run pack
```

打包结果为 `my-plugin-<version>.inplugin`。

### AI 辅助开发

先配置 AI 提供商：

```bash
mulby ai setup
```

然后创建插件：

```bash
mulby create my-plugin --ai --desc "描述插件要做什么"
```

如果中途中断，可以在插件目录中恢复会话：

```bash
mulby resume
```

## 核心命令

| 命令 | 说明 |
|------|------|
| `mulby create <name>` | 创建插件项目 |
| `mulby create <name> --template basic` | 创建无 UI 插件 |
| `mulby create <name> --ai --desc "..."` | 使用 AI 辅助开发插件 |
| `mulby dev` | 开发模式，监听构建 |
| `mulby build` | 构建插件 |
| `mulby pack` | 打包为 `.inplugin` |
| `mulby resume` | 恢复当前目录的 AI 会话 |
| `mulby ai setup` | 快速配置默认 AI 提供商 |
| `mulby ai list` | 查看 AI 配置 |
| `mulby --help` | 查看完整命令帮助 |

## 项目模板

### React 模板

适合有界面的插件，默认生成：

```text
my-plugin/
├── manifest.json
├── package.json
├── icon.png
├── src/
│   ├── main.ts
│   ├── types/mulby.d.ts
│   └── ui/
│       ├── App.tsx
│       ├── main.tsx
│       └── index.html
├── dist/
└── ui/
```

### Basic 模板

适合无界面的后台型插件：

```text
my-plugin/
├── manifest.json
├── package.json
├── icon.png
└── src/
    └── main.ts
```

## `manifest.json` 最小示例

```json
{
  "id": "my-plugin",
  "name": "my-plugin",
  "version": "1.0.0",
  "displayName": "我的插件",
  "description": "插件功能描述",
  "main": "dist/main.js",
  "icon": "icon.png",
  "features": [
    {
      "code": "main",
      "explain": "主功能",
      "cmds": [
        { "type": "keyword", "value": "myplugin" }
      ]
    }
  ]
}
```

常见字段：

- `ui`: React 或其他前端界面入口，例如 `ui/index.html`
- `preload`: 可选 CommonJS preload，例如 `preload.cjs`。当插件 UI 需要 Node.js、Electron 桥接、原生模块或外部二进制时使用
- `assets`: 打包白名单。额外 HTML、子窗口 preload、`.node` 原生模块、外部二进制、语言包等运行资源需要列入
- `type`: 插件类型，例如 `utility`、`developer`、`ai`
- `pluginSetting`: 插件窗口行为，例如 `single`、`height`
- `window`: 独立窗口尺寸和窗口行为配置，例如 `type`、`width`、`height`、`alwaysOnTop`、`skipTaskbar`

### 旧插件兼容窗口

新插件推荐使用单入口 UI 和前端路由。迁移 zTools/uTools 风格插件时，如果旧插件由多个 HTML 页面组成，可以显式使用文件窗口模式：

```js
const child = await window.mulby.window.create('region/index.html?key=abc', {
  loadMode: 'file',
  preload: 'region/preload.cjs',
  width: 640,
  height: 480
})
```

文件窗口只能加载插件目录内的相对 `.html` / `.htm` 文件；`preload` 只能指向插件目录内的 `.js` / `.cjs` 文件。未指定窗口 preload 时会回退到 `manifest.preload`。

使用 `mulby pack` 时，把这些额外资源写入 `manifest.assets`：

```json
{
  "assets": [
    "region",
    "effect",
    "countdown.html",
    "region/preload.cjs",
    "addon-darwin-arm64.node",
    "bin/aperture"
  ]
}
```

### macOS Dock 行为

`mode: "detached"` 的插件窗口在 macOS 上由 Mulby 的应用级 Dock 图标表示。存在插件独立窗口时，宿主会优先显示“Mulby 图标 + 最近聚焦插件图标”的组合样式，多窗口时显示数量徽标。

Dock 右键菜单会提供插件窗口切换、关闭插件窗口、打开 Mulby 和退出 Mulby 等操作。系统 Dock 的“退出”仍然退出宿主应用；只关闭插件应使用插件窗口菜单或插件 UI 内的关闭能力。

`skipTaskbar` 只表示请求隐藏具体窗口的任务栏/Dock 呈现，不能保证隐藏 Mulby 应用级 Dock 图标。

## AI 开发与内置 Skill

`mulby-cli` 发布到 npm 后，AI 开发仍然可以直接使用内置 skill，不需要用户额外安装。

默认内置：

- `develop-mulby-plugin`
  - 负责插件架构、模板选择、API 文档导航、开发闭环、验证与打包
- `generate-electron-icons`
  - 负责从 SVG 生成最终图标资源

AI 开发时的默认策略：

1. 先使用 `develop-mulby-plugin` 规划和实现插件。
2. 插件功能和 UI 主题稳定后，再生成符合主题的 `icon.svg`。
3. 使用 `generate-electron-icons` 将 SVG 转成最终 `512x512` 的 `icon.png`。
4. 用生成的 `icon.png` 替换模板默认图标，再执行 `mulby pack`。

这意味着：

- `mulby-cli` 内部 AI 使用 bundled skills 作为主知识来源
- 维护时只需要持续完善 repo 根目录下的 skill 内容

## 构建与打包

开发时：

```bash
pnpm run dev
```

生产构建：

```bash
pnpm run build
```

打包：

```bash
pnpm run pack
```

注意：

- `pack` 前请先执行 `build`
- 包内 `manifest.json` 会把 `main` 改写为包内实际入口 `main.js`
- 插件根目录下的 `icon.png` 会被一起打进包里
- 如果是 React 插件，确保 `ui/` 构建产物已经生成
- 除默认入口外的额外 HTML、preload、原生模块和二进制资源需要通过 `manifest.assets` 显式打包

## 深度文档在哪里

README 只保留高频入口。更完整的 Mulby 插件开发知识已经放进内置 skill。

如果你在维护仓库源码，source of truth 在：

- `skills/develop-mulby-plugin`
- `skills/generate-electron-icons`

如果你是在 `mulby-cli` 的 AI 会话里工作，优先阅读：

- `@skills/develop-mulby-plugin/SKILL.md`
- `@skills/develop-mulby-plugin/references/plugin-development-guide.md`
- `@skills/develop-mulby-plugin/references/apis/README.md`
- `@skills/generate-electron-icons/SKILL.md`

## 常见问题

### `mulby create` 之后还需要做什么？

进入插件目录，安装依赖，然后运行 `pnpm run dev`。

### `mulby pack` 会自动构建吗？

不会。请先运行 `mulby build` 或 `pnpm run build`。

### `mulby pack` 会打包后端依赖吗？

会。`mulby pack` 会分析 `dist/main.js` 和 `manifest.preload` 的运行时依赖，并把需要的 `node_modules` 文件一起写入 `.inplugin`。这包括 `sharp` 这类 native addon 依赖的 `.node` 和平台库文件。

但静态分析无法知道运行时按字符串路径加载的资源。额外 HTML、子窗口 preload、独立 `.node` 文件和外部二进制请写入 `manifest.assets`。

### 还可以查看更完整的命令帮助吗？

可以：

```bash
mulby --help
mulby ai --help
```
