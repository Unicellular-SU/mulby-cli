import * as fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import { createBasicProject } from './basic'
import { createReactProject } from './react'

export async function create(name: string, options: any) {
  if (options.ai || options.resume) {
    // 动态导入，只在使用 AI 功能时才加载 AI 相关模块
    const { aiCreate } = await import('./ai-create');
    await aiCreate(name, options);
    return;
  }

  const targetDir = path.resolve(process.cwd(), name)

  // 校验插件名称合法性
  const NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
  if (!NAME_REGEX.test(name)) {
    console.log(chalk.red('错误: 插件名称只能包含字母、数字、连字符(-)、下划线(_)和点(.)，且必须以字母或数字开头'))
    process.exit(1)
  }

  if (fs.existsSync(targetDir)) {
    console.log(chalk.red(`错误: 目录 ${name} 已存在`))
    process.exit(1)
  }

  const template = options.template || 'react'

  console.log(chalk.blue(`创建插件项目: ${name}`))
  console.log(chalk.gray(`模板: ${template}`))
  console.log()

  if (template === 'react') {
    await createReactProject(targetDir, name)
  } else {
    await createBasicProject(targetDir, name)
  }

  console.log()
  console.log(chalk.green('插件创建成功!'))
  console.log()
  console.log('下一步:')
  console.log(chalk.cyan(`  cd ${name}`))
  console.log(chalk.cyan('  pnpm install'))
  console.log(chalk.cyan('  pnpm run dev'))
}
