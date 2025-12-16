# 🐦 Twitter Audit Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/peny-eth/twitter-audit-tool)

一个开源的 Twitter 用户审核工具，支持批量检查用户粉丝数量和自定义关键词检测。

## ✨ 功能特点

- 📊 **智能表格解析** - 支持 .xlsx, .xls, .csv 格式，自动识别 Twitter Handle
- 🔗 **自动生成链接** - 为所有 Handle 自动生成 Twitter 链接
- 👥 **粉丝数量统计** - 获取真实的 Twitter 粉丝数据
- 🏷️ **关键词检测** - 自定义关键词检测用户简介和推文
- 📥 **导出结果** - 将审核结果导出为 Excel 文件
- 🔒 **隐私安全** - API Key 仅存储在本地浏览器中
- 🌐 **开源免费** - 完全开源，可本地运行或部署到 Vercel

## 🚀 在线 Demo

👉 **[Live Demo](https://twitter-audit-tool.vercel.app)** (需要配置您自己的 Twitter API Key)

## 🚀 快速开始

### 方式一：部署到 Vercel（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/peny-eth/twitter-audit-tool)

1. 点击上方按钮一键部署
2. 在 Vercel 项目设置中添加环境变量（可选）：
   - `TWITTER_BEARER_TOKEN`: 您的 Twitter API Bearer Token
3. 访问部署后的 URL，在设置中配置 API Key

### 方式二：本地运行

```bash
# 克隆项目
git clone https://github.com/peny-eth/twitter-audit-tool.git
cd twitter-audit-tool

# 启动服务器
node server.js

# 访问 http://localhost:3000
```

## 🔑 获取 Twitter API Key

1. 访问 [developer.twitter.com](https://developer.twitter.com/)
2. 注册/登录开发者账号
3. 创建一个新的 App
4. 在 "Keys and Tokens" 页面获取 **Bearer Token**

> ⚠️ **注意**：Twitter 免费版 API 每月仅有约 100 次读取请求限额

## 📁 支持的表格格式

工具会自动识别表格中的 Twitter Handle，支持以下格式：

- 以 `@` 开头的用户名：`@username`
- 纯用户名：`username`
- Twitter 链接：`https://twitter.com/username` 或 `https://x.com/username`

## ⚙️ 配置选项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| API Key | Twitter Bearer Token | - |
| 关键词 | 检测的关键词列表 | AI, ChatGPT, GPT, ... |
| 请求间隔 | 每个用户之间的等待时间 | 60 秒 |

## ⚠️ API 限制说明

Twitter 免费版 API 有严格的速率限制：

| 限制项 | 数值 |
|--------|------|
| 每月读取请求 | ~100 次 |
| 每 15 分钟请求 | ~6-7 次 |
| 每用户 API 调用 | 2 次（用户信息 + 推文） |

**建议**：每次审核不超过 5-10 个用户，设置足够的请求间隔。

## 📂 项目结构

```
twitter-audit-tool/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── app.js              # 前端逻辑
├── server.js           # 本地开发服务器
├── api/                # Vercel Serverless Functions
│   └── user/
│       └── [username].js
├── vercel.json         # Vercel 配置
├── .env.example        # 环境变量示例
└── README.md           # 说明文档
```

## 🛠️ 技术栈

- **前端**：原生 HTML/CSS/JavaScript
- **后端**：Node.js / Vercel Serverless Functions
- **Excel 处理**：SheetJS (xlsx)

## 🔧 本地开发

```bash
# 克隆项目
git clone https://github.com/peny-eth/twitter-audit-tool.git
cd twitter-audit-tool

# 使用 Vercel CLI 本地开发
npm i -g vercel
vercel dev

# 或者使用 Node.js 服务器
node server.js
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## ⚠️ 免责声明

- 本工具仅供学习和研究使用
- 使用本工具时请遵守 Twitter 的使用条款和 API 政策
- 请合理使用 API 配额，避免滥用

## 🙏 致谢

- [SheetJS](https://sheetjs.com/) - Excel 文件处理
- [Inter Font](https://rsms.me/inter/) - UI 字体
- [Twitter API](https://developer.twitter.com/) - 数据接口

---

Made with ❤️ by [@Penny777](https://x.com/Penny777_eth)
