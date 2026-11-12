# 自媒体工作台（WorkBuddy 生图版）

[English](README.en.md) · **中文**

> 把自媒体工作台的「DSH 生成工具」模式接上 WorkBuddy 生图：**不用单独买图片 API，用你已有的 WorkBuddy 积分画图。**

一句话记灵感，一键成稿——口播脚本、标题、视频封面、配图和黑白线稿分镜。封面、配图、分镜图由 WorkBuddy 生图模型产出，和其他模型能力共用同一份积分额度。

---

## 这是什么

本项目是 [dsh-media-desk](https://github.com/woniuniuniu/dsh-media-desk)（原作者 [woniuniuniu / 蜗牛的科技笔记](https://github.com/woniuniuniu)，MIT）的衍生分发版，在保留上游全部功能的基础上增加了一个**桥接插件**：

- 上游工作台原本支持两种生图来源：`图片 API`（自己填 OpenAI 兼容接口和 Key）和 `DSH 生成工具`（复用宿主里已注册的生图工具）。
- 后者原本只适配 `dsh-plugin-subscriptions` 注册的 `image_generate`。本项目提供的桥接插件注册同名工具，内部转调 [dsh-connect-workbuddy](https://github.com/dingminhua/dsh-connect-workbuddy) 的 `workbuddy_draw_image`，把图片下载到工作台允许的目录后交回。

净结果：**装好 WorkBuddy 插件并打开生图开关后，工作台「DSH 生成工具」直接可用，不需要任何图片 API Key。**

## 前置条件

必须同时满足：

1. **DeepSeek Harness** `>=0.2.1-rc.5 <0.3.0`（已在 `0.2.2-rc.1` 实测）
2. **已安装 [dsh-connect-workbuddy](https://github.com/dingminhua/dsh-connect-workbuddy)** —— 本项目的生图能力**完全依赖它**，没有它桥接插件会报「未找到 workbuddy_draw_image」
3. **在 WorkBuddy 插件设置里打开对应区域的「允许模型自主生图」** —— 不打开时该工具根本不会注册，模型也看不到它

## 安装

### 方式一：从 npm 安装（可直接复制）

```sh
dsh plugin --profile web add dsh-media-desk-workbuddy
```

把 `web` 换成你实际使用的 profile 名即可（常见为 `web` 或 `desktop`）。

### 方式二：从 GitHub 源码安装

```sh
dsh plugin --profile web add github:ccjiao/dsh-media-desk-workbuddy
```

### 方式三：本地目录安装

```sh
git clone https://github.com/ccjiao/dsh-media-desk-workbuddy.git
dsh plugin --profile web add ./dsh-media-desk-workbuddy
```

安装后**刷新 DSH 页面**；若侧栏仍无入口，重启 DeepSeek Harness（已装插件的模块需重新加载）。

## 使用

1. 刷新页面，点击侧栏「自媒体工作台」
2. 打开设置 →「生图来源」→ 选中 **「DSH 生成工具」**
3. 此时应显示可用（不再出现「未找到订阅生图工具」）
4. 点「保存」，再点「试画一张」验证链路
5. 回到灵感墙，正常一键成稿即可

## 计费说明（重要）

**生图真实消耗 WorkBuddy 积分，不是免费额度。**

| 区域 | 参考单价 | 说明 |
|---|---|---|
| 国内版 | 约 5.71 积分/张 | 两个区积分池**彼此独立** |
| 国际版 | 约 0.03 积分/张 | 与国内版不是同一张图的跨区差价 |

- 以上为撰写时的参考值，**实际扣费以 WorkBuddy 返回的 `credit` 与额度面板为准**。
- 积分不等于人民币，且没有官方汇率，本项目不提供任何折算。
- 一次成稿默认 9 张图，数量可在设置里调低；**先调小再试跑**是控制成本最直接的办法。
- 两个区都开着时优先走国内版（较贵的那一档）。想锁定便宜的区域，请在 WorkBuddy 插件设置里关掉不想用的那个区的「允许模型自主生图」。

## 合规与免责声明

**请在使用前完整阅读本节。**

1. **非官方集成。** 本项目及其依赖的 `dsh-connect-workbuddy` 均**不是**腾讯 / WorkBuddy / CodeBuddy 的官方产品或官方支持项目，与上述公司**没有任何隶属、合作、背书或授权关系**。所有相关商标、服务名称归其各自所有者。
2. **调用的是客户端自身接口，不是开放 API。** `dsh-connect-workbuddy` 复用本机 WorkBuddy 客户端的登录态与接口，这类接口可能随上游调整而变化，**随时可能失效**，需要跟上游更新。
3. **账号风险自行评估。** 使用非官方接口可能违反服务条款，存在被限流、功能受限或账号处置的风险。是否使用由你自行决定并承担后果，本项目作者不承担任何责任。
4. **费用自负。** 所有积分消耗由你的 WorkBuddy 账号承担。
5. **生成内容责任自负。** 你对自己生成的图片及其后续使用（发布、商用、肖像权、著作权等）负责，请遵守所在地区法律法规与平台规则。
6. **无担保。** 本项目按 MIT 协议「原样」提供，不附带任何明示或暗示担保。

本项目**不含**任何密钥、账号或登录凭据，也不会向作者或第三方服务器发送数据。

## 许可证与署名

本项目以 **MIT** 协议发布。

- 上游 [dsh-media-desk](https://github.com/woniuniuniu/dsh-media-desk) © 2026 woniuniuniu（蜗牛的科技笔记），MIT —— 其全部源码与美术资源按 MIT 原样再分发，原始 `LICENSE` 见 [LICENSE](LICENSE)。
- 本项目新增部分（`bridge/` 目录与打包配置）© 2026 ccjiao，MIT。
- 生图能力来自 [dsh-connect-workbuddy](https://github.com/dingminhua/dsh-connect-workbuddy)，**本项目不打包、不修改它，需你自行安装**。

上游工作台若发布新版本而你希望跟进，需手动把上游改动合并进本仓库；本仓库不保证与上游同步节奏。

## 与上游的差异

新增/变更仅限：

| 路径 | 变更 |
|---|---|
| `bridge/` | 新增。WorkBuddy 生图桥接插件 |
| `cordis.patch.yml` | 新增桥接 row；工作台 row 指向本仓库包名 |
| `package.json` | 改包名、补衍生关系与署名元数据 |
| `src/`、`dist/`、`assets/` | **未修改**，与上游 2.6.2 一致 |

除了上述文件，上游代码**没有任何改动**。

## 排障

| 现象 | 处理 |
|---|---|
| 设置页仍显示「未找到订阅生图工具」 | 确认 `dsh-connect-workbuddy` 已装且「允许模型自主生图」已开；刷新页面 |
| 报「未找到 workbuddy_draw_image」 | WorkBuddy 插件的生图开关没开，或该插件未启用 |
| 生图报 `NOT_LOGGED_IN` | 该区没登录，或该区的生图开关没开（此错误不扣积分） |
| 侧栏没有入口 | 先刷新；仍无则重启 DSH |
