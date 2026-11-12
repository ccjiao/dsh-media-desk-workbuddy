// 把媒体工作台的「DSH 生成工具」模式接到 dsh-connect-workbuddy 的文生图能力。
//
// 工作台只认工具名 image_generate / dsh_subscriptions_image_generate，要求输出
// { paths: [绝对路径] }，且图片必须 realpath 落在
// <DSH_HOME>/plugins/subscriptions/images/ 内（见 src/image-tool.js）。
// WorkBuddy 的工具名是 workbuddy_draw_image，返回 COS 签名 URL。本插件注册工作台
// 认识的那个工具名，转调 WorkBuddy 工具定义的 execute，再把图片下载到工作台允许的
// 目录，完成两端对齐。
//
// 本插件只通过宿主公开的工具接口对接，不 import dsh-connect-workbuddy 的任何模块，
// 也不读取它的凭据；因此它升级不影响本插件，本插件也不承担其接口变化的风险。

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 工作台 imageTool() 检测的名字；取第二个，避免与订阅插件真身冲突。 */
const BRIDGE_TOOL_NAME = 'image_generate'
/** 被转调的 WorkBuddy 工具名。 */
const SOURCE_TOOL_NAME = 'workbuddy_draw_image'
/** 与工作台一致的有界读取上限。 */
const MAX_BYTES = 40_000_000
/** 工作台传来的尺寸里，auto 对文生图无意义，兜底成方图。 */
const DEFAULT_SIZE = '1024x1024'

export const inject = ['tools']

/** 与工作台 readGeneratedImage() 相同的根目录解析，否则 realpath 校验会拒绝。 */
function outputDir() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'plugins', 'subscriptions', 'images')
}

function log(ctx, level, message) {
  const logger = ctx?.logger
  if (logger && typeof logger[level] === 'function') logger[level](message)
  else if (level === 'error' || level === 'warn') console.error(message)
}

/** 从 WorkBuddy 工具返回里取图片字节：本地 path 优先，其次 file://，最后 http(s)。 */
async function readImageBytes(value, signal) {
  const record = value && typeof value === 'object' ? value : {}
  const localPath = typeof record.path === 'string' && isAbsolute(record.path) ? record.path : undefined
  const url = typeof record.url === 'string' ? record.url : ''

  if (localPath) return Buffer.from(await readFile(localPath))
  if (url.startsWith('file://')) return Buffer.from(await readFile(fileURLToPath(url)))
  if (/^https?:\/\//i.test(url)) {
    const response = await fetch(url, signal ? { signal } : {})
    if (!response.ok) throw new Error(`下载 WorkBuddy 图片失败（HTTP ${response.status}）`)
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > MAX_BYTES) throw new Error('WorkBuddy 图片超过 40 MB 上限')
    return buffer
  }
  throw new Error('WorkBuddy 生图没有返回可用的图片地址')
}

function extensionOf(buffer) {
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return '.png'
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return '.jpg'
  if (buffer.length > 12 && buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return '.webp'
  if (buffer.length > 6 && buffer.toString('latin1', 0, 3) === 'GIF') return '.gif'
  throw new Error('WorkBuddy 返回的不是受支持的图片格式')
}

function definitionFor(ctx) {
  return {
    name: BRIDGE_TOOL_NAME,
    description: '为自媒体工作台的「DSH 生成工具」模式生成一张图片：转调 WorkBuddy 文生图。',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: '画面描述。' },
        size: { type: 'string', description: '输出尺寸（宽x高），或 auto。' },
        quality: { type: 'string', description: '保留参数，WorkBuddy 不使用。' }
      },
      required: ['prompt'],
      additionalProperties: false
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            items: { type: 'string' },
            description: '生成图片的本地绝对路径。'
          }
        },
        required: ['paths'],
        additionalProperties: false
      },
      render(_args, value) {
        const paths = value && typeof value === 'object' && Array.isArray(value.paths) ? value.paths : []
        return [{ type: 'text', text: paths.length ? `已生成图片：${paths[0]}` : '未生成图片' }]
      }
    },
    async execute(args, exec) {
      const record = args && typeof args === 'object' ? args : {}
      const prompt = typeof record.prompt === 'string' ? record.prompt.trim() : ''
      if (!prompt) throw new Error('image_generate: 参数 prompt 必填，且必须是非空字符串。')
      const requestedSize = typeof record.size === 'string' ? record.size : ''
      // auto 只在改图时可用；这里始终文生图，兜底成默认方图。
      const size = requestedSize && requestedSize !== 'auto' ? requestedSize : DEFAULT_SIZE

      const tools = ctx.get('tools')
      const source = tools?.executable(SOURCE_TOOL_NAME)
      if (!source || typeof source.execute !== 'function') {
        throw new Error('未找到 workbuddy_draw_image，请确认已安装 dsh-connect-workbuddy 并在设置里打开「允许模型自主生图」。')
      }

      // 直接调用 WorkBuddy 工具定义的 execute：它的依赖都闭包在自身实现里，
      // 不依赖执行器分发，也不会与本工具的执行形成重入。
      const signal = exec?.signal
      const value = await source.execute({ prompt, size }, signal ? { signal } : {})

      const buffer = await readImageBytes(value, signal)
      const ext = extensionOf(buffer)
      const dir = outputDir()
      await mkdir(dir, { recursive: true })
      const path = join(dir, `workbuddy-${randomUUID()}${ext}`)
      await writeFile(path, buffer)
      log(ctx, 'info', `media-desk-workbuddy-bridge: 已生成 ${path}（${buffer.length} 字节）`)
      return { paths: [path] }
    }
  }
}

export function apply(ctx) {
  const tools = ctx.get('tools')
  if (!tools || typeof tools.register !== 'function') {
    log(ctx, 'warn', 'media-desk-workbuddy-bridge: 当前 profile 没有 tools 服务，跳过注册')
    return
  }
  // 注册是效果：插件卸载或 profile 变更时自动撤销。
  ctx.effect(() => tools.register(definitionFor(ctx)), 'media-desk-workbuddy-bridge: image_generate')
  log(ctx, 'info', `media-desk-workbuddy-bridge: 已注册 ${BRIDGE_TOOL_NAME}，转发到 ${SOURCE_TOOL_NAME}`)
}
