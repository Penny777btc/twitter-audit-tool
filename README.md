# 🐦 Twitter Audit Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Made with Node.js](https://img.shields.io/badge/Node.js->=14.0-green.svg)](https://nodejs.org/)

一个开源的 Twitter 用户审核工具，支持批量检查用户粉丝数量和自定义关键词检测。

![Screenshot](screenshot.png)

## ✨ 功能特点

- 📊 **智能表格解析** - 支持 .xlsx, .xls, .csv 格式，自动识别 Twitter Handle
- 🔗 **自动生成链接** - 为所有 Handle 自动生成 Twitter 链接
- 👥 **粉丝数量统计** - 获取真实的 Twitter 粉丝数据
- 🏷️ **关键词检测** - 自定义关键词检测用户简介和推文
- 📥 **导出结果** - 将审核结果导出为 Excel 文件
- 🔒 **隐私安全** - API Key 仅存储在本地浏览器中
- 🌐 **开源免费** - 完全开源，可本地运行

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/twitter-audit-tool.git
cd twitter-audit-tool
```

### 2. 启动服务器

```bash
node server.js
```

### 3. 访问工具

打开浏览器访问：**http://localhost:3000**

### 4. 配置设置

1. 点击右上角 ⚙️ **设置** 按钮
2. 输入您的 **Twitter API Bearer Token**
3. （可选）自定义检测关键词
4. 保存设置

### 5. 开始使用

1. 上传包含 Twitter Handle 的表格文件
2. 点击 **开始审核** 按钮
3. 等待审核完成
4. 查看结果并导出

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
├── server.js           # 后端服务器（API 代理）
├── .env.example        # 环境变量示例
├── .gitignore          # Git 忽略文件
└── README.md           # 说明文档
```

## 🛠️ 技术栈

- **前端**：原生 HTML/CSS/JavaScript
- **后端**：Node.js (无依赖)
- **Excel 处理**：SheetJS (xlsx)

## 🔧 高级配置

### 使用环境变量

如果您想预配置 API Key（例如部署到服务器），可以使用环境变量：

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 添加您的 API Key
TWITTER_BEARER_TOKEN=your_bearer_token_here

# 安装 dotenv（可选）
npm install dotenv

# 启动服务器
node server.js
```

### 修改默认端口

```bash
PORT=8080 node server.js
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

Made with ❤️ by the community
