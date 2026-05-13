/**
 * React 插件模板 - 后端代码生成器
 * 包含：src/main.ts
 */

/**
 * 生成后端 main.ts 内容
 */
export function buildBackendMain(name: string) {
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

// run 是插件入口，context 由宿主注入（包含 featureCode / input / attachments / api）
export async function run(_context: BackendPluginContext) {
  mulby.notification.show('插件已启动')
}

// ─── 供 UI 调用的后端方法 ───────────────────────────────────────────
// 使用 rpc 命名空间：参数 1:1 精准映射，不再有隐式 context 首参偏移。
// 前端调用示例：await window.mulby.host.call('${name}', 'processData', data)

export const rpc = {
  // 示例方法：处理数据
  async processData(data: any) {
    mulby.notification.show('处理数据中...')

    // 处理逻辑
    const result = {
      ...data,
      processed: true,
      timestamp: Date.now()
    }

    return result
  },

  // 示例方法：获取配置
  async getConfig() {
    // 直接通过全局 mulby 对象调用任意宿主 API，无需 context 参数
    return {
      version: '1.0.0',
      settings: {}
    }
  }
}

// --- Plugin Tools (AI Agent 工具) ---
// 如果 manifest.json 中声明了 tools，在 onLoad 中注册 handler：
//
// export function onLoad() {
//   mulby.tools.register('my_tool', async (args) => {
//     // args 对应 manifest.tools[].inputSchema 定义的参数
//     return { result: '处理结果' }
//   })
// }
//
// --- Messaging subscriptions ---
// 如果需要接收其他插件消息，把订阅保持在后端，并通过 rpc 暴露缓存给 UI。
// 若没有 UI 时也要接收消息，请在 manifest.pluginSetting 中启用 background。
// 是否跟随 Mulby 启动由用户在插件窗口菜单或搜索结果右键菜单中勾选；如果需要重启恢复，请启用 persistent。
// 并在 onBackground(context) 中调用同一个 registerMessaging(context.api)。
//
// let messageHandler: ((message: PluginMessage) => void | Promise<void>) | null = null
// const recentMessages: PluginMessage[] = []
//
// function registerMessaging(api: BackendPluginAPI) {
//   if (messageHandler) api.messaging.off(messageHandler)
//   messageHandler = (message) => {
//     recentMessages.unshift(message)
//     recentMessages.splice(50)
//   }
//   api.messaging.on(messageHandler)
// }

const plugin = { onLoad, onUnload, onEnable, onDisable, run, rpc }
export default plugin
`
}
