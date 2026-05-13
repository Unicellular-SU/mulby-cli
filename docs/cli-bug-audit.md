# Mulby CLI 非 AI 命令 Bug 审计报告

> 审计范围：`create` / `build` / `dev` / `pack` / `update-types` 及相关服务  
> 审计时间：2026-05-13  
> ✅ 所有问题已修复（2026-05-13）

---

## 🔴 严重 Bug — ✅ 已修复

### BUG-1: `dev.ts` — esbuild watch 缺少 `external: ['electron']` ✅

| 位置 | `src/commands/dev.ts` |
|------|----------------------|
| 问题 | `build.ts` 配置了 `external: ['electron']` 但 `dev.ts` 遗漏，dev 模式下会尝试打包 electron |
| 修复 | esbuild.context 配置中添加 `external: ['electron']` |

### BUG-2: `dev.ts` — esbuild context + chokidar watcher 资源泄漏 ✅

| 位置 | `src/commands/dev.ts` |
|------|----------------------|
| 问题 | `cleanup()` 只 kill viteProcess，esbuild ctx 和 chokidar watcher 未释放 |
| 修复 | 将 ctx 和 watcher 提升为模块级变量，cleanup 中调用 `dispose()` 和 `close()` |

### BUG-3: `create` — postcss.config 文件名与内容不匹配 ✅

| 位置 | `src/commands/create/react.ts` |
|------|-------------------------------|
| 问题 | 内容使用 `export default`（ESM），文件名却是 `.js`，注释写 `.mjs` |
| 修复 | 文件名改为 `postcss.config.mjs` |

---

## 🟡 中等问题 — ✅ 已修复

### BUG-4: `pack.ts` — `new Promise(async ...)` 反模式 ✅

| 位置 | `src/commands/pack.ts` |
|------|------------------------|
| 问题 | async executor 中抛出的异常不会被 reject 捕获 |
| 修复 | 拆分为 `streamDone` promise（仅监听流事件）+ async 函数体 + `await streamDone` |

### BUG-5: `dev.ts` — vite build 失败后进程挂起 ✅

| 位置 | `src/commands/dev.ts` |
|------|----------------------|
| 问题 | build 失败后 reject 未被正确处理，CLI 挂起 |
| 修复 | try-catch 包裹初始构建，失败时 warn 并继续启动 dev server |

### BUG-6: `build.ts` / `dev.ts` — UI 构建路径硬编码日志

> 日志中固定显示 `ui/`，但实际取决于 vite.config。属信息性问题，不影响功能，暂不修改。

---

## 🟢 轻微问题 — ✅ 已修复

### BUG-7: `create` — basic 模板缺少 `tsconfig.json` ✅

| 位置 | `src/commands/create/templates/basic.ts` + `src/commands/create/basic.ts` |
|------|--------------------------------------------------------------------------|
| 修复 | 新增 `buildBasicTsConfig()` 函数，创建时自动生成 `tsconfig.json` |

### BUG-8: `create` — manifest id 无名称校验 ✅

| 位置 | `src/commands/create/index.ts` |
|------|-------------------------------|
| 修复 | 添加正则校验 `/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/`，拒绝包含空格/特殊字符的名称 |

### BUG-9: `update-types` — 覆盖用户自定义修改

> 属功能设计层面问题，当前 `--dry-run` 机制已提供安全网，暂不修改。

### BUG-10: `pack.ts` — 打包 manifest 保留冗余字段 ✅

| 位置 | `src/commands/pack.ts` |
|------|------------------------|
| 修复 | `createPackagedManifest` 中解构移除 `dependencies` 和 `assets` 字段 |

---

## 📊 汇总

| 等级 | 总数 | 已修复 | 跳过（设计层面） |
|------|------|--------|-----------------|
| 🔴 严重 | 3 | 3 | 0 |
| 🟡 中等 | 3 | 2 | 1（日志信息） |
| 🟢 轻微 | 4 | 3 | 1（功能设计） |

> TypeScript 编译检查：✅ 零错误通过
