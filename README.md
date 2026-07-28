# Personal Schedule System

一个基于本地运行的个人日程管理系统，支持日程规划、时间线管理、历史回看、数据统计以及智能提醒。

项目采用 **Local-first（本地优先）设计理念**：核心数据默认保存在用户本机，不依赖云端数据库，保证个人日程数据的隐私、安全与可控。

当前版本支持：

- 日程创建、编辑、完成、删除
- 可视化时间线管理
- 历史日期回看
- 月度 / 年度数据汇总
- 本地数据存储
- 自动提醒与桌面通知
- 基于 LLM 的周期性总结分析

项目最初基于原生 HTML、CSS、JavaScript 开发，后续逐步扩展本地后端服务，实现从静态网页到智能个人管理系统的演进。

---

# ✨ 项目特点

## 1. 可视化时间线管理

系统提供 `06:00 - 24:00` 的纵向时间轴：

- 点击时间线空白区域快速创建任务
- 拖动任务块调整开始时间
- 拖动任务上下边缘调整持续时间
- 支持分钟级时间管理

示例：

```
09:00 - 10:30
机器学习课程学习
```

---

## 2. 灵活的任务管理

支持：

- 新增日程
- 编辑日程
- 完成任务
- 删除任务
- 自定义任务持续时间

支持多种时间输入格式：

```
105
```

表示：

```
105分钟
```

或者：

```
1h45min
```

表示：

```
1小时45分钟
```

日程块采用蓝色 / 粉色马卡龙配色，提高视觉区分度。

---

## 3. 历史记录与数据总结

系统支持：

- 月度日历回看
- 年度任务统计
- 历史日期查询
- 周期性总结分析

用户可以查看过去任意日期的任务安排和完成情况。

---

# 🏗️ 项目结构

```
DailySchedule/

├─ public/
│  └─ icon/
│     ├─ icon.ico
│     └─ icon.png
│
├─ src/
│  └─ index.html
│
├─ backend/
│  ├─ server.mjs
│  ├─ config.mjs
│  │
│  ├─ database/
│  │  └─ jsonDatabase.mjs
│  │
│  ├─ services/
│  │  ├─ llmService.mjs
│  │  ├─ notificationService.mjs
│  │  ├─ reminderScheduler.mjs
│  │  └─ scheduleService.mjs
│  │
│  └─ data/
│     └─ .gitkeep
│
├─ scripts/
│  ├─ check.mjs
│  └─ serve.mjs
│
├─ docs/
│  └─ backend-architecture.md
│
├─ .gitignore
├─ package.json
├─ README.md
└─ schedule.html
```

目录说明：

| 文件 | 作用 |
|-|-|
| `src/index.html` | 前端页面主体 |
| `backend/` | 本地后端服务 |
| `services/` | 业务逻辑模块 |
| `database/` | 本地数据存储 |
| `scripts/` | 工具脚本 |
| `schedule.html` | 兼容旧桌面快捷方式入口 |

---

# 🚀 本地运行

## 环境要求

- Node.js

项目无需安装额外 npm 依赖。

---

## 启动完整系统

运行：

```bash
npm start
```

默认访问：

```
http://localhost:5173
```

启动后包含：

- 前端页面服务
- 本地 API
- 数据存储
- 定时任务系统
- Windows 桌面通知
- LLM 总结模块

---

## 修改运行端口

Linux / macOS：

```bash
PORT=5180 npm start
```

Windows PowerShell：

```powershell
$env:PORT=5180; npm start
```

---

## 仅运行静态前端

如果只需要调试网页：

```bash
npm run start:static
```

该模式不会启动：

- 后端 API
- 提醒服务
- LLM 模块

---

# 🔍 代码检查

运行：

```bash
npm run check
```

用于检查基础 JavaScript 语法错误。

---

# 💾 数据存储设计

## 前端 LocalStorage

项目早期版本采用浏览器 `localStorage` 存储数据。

数据格式：

```
daily-schedule:YYYY-MM-DD
```

例如：

```
daily-schedule:2026-07-28
```

特点：

- 无需数据库
- 数据保存在用户浏览器
- 同一浏览器、同一访问地址可恢复历史记录

注意：

清理浏览器站点数据会删除本地日程。

---

## 当前本地数据库

引入后端后，数据由：

```
backend/data/
```

统一管理。

后端负责：

- 日程数据管理
- 用户习惯记录
- 提醒状态维护
- 周期总结生成

避免前端直接操作数据，提高系统可维护性。

---

# 🧩 后端架构设计

项目采用传统软件工程架构，而非 Agent Framework。

整体结构：

```
Frontend
    |
    |
 REST API
    |
    |
Backend Service Layer
    |
 ┌───────────────┐
 │               │
Database     Scheduler
 │               │
 │          Notification
 │
 LLM Service
```

核心设计思想：

> 确定性的业务逻辑交给传统软件架构，LLM 只作为智能增强模块。

---

# 📡 API 接口

## 创建任务

```
POST /api/tasks
```

---

## 记录运动完成情况

```
POST /api/habits/sport
```

---

## 记录 GitHub 维护情况

```
POST /api/habits/github
```

---

## 开机状态检查

```
POST /api/startup-check
```

用于：

- 查询当天重要事项
- 检查习惯完成情况
- 触发提醒

---

## 周总结生成

```
GET /api/weekly-summary
```

生成：

- 本周任务完成情况
- 时间投入分析
- 行为模式总结

---

# 🔔 自动提醒系统

系统包含本地定时任务模块：

```
reminderScheduler.mjs
```

负责：

- 检查待完成事项
- 判断提醒条件
- 触发桌面通知

例如：

```
18:00

提醒：
今天还没有完成运动计划
```

---

# 🤖 LLM 智能模块

项目当前不使用：

- LangChain
- LangGraph
- Agent Framework

原因：

当前需求主要包括：

- 日程管理
- 条件判断
- 时间提醒
- 数据统计

这些任务具有明确规则，更适合传统后端架构。

LLM 主要用于：

- 周总结生成
- 自然语言分析
- 个人行为反馈

架构：

```
Schedule Data
      |
      |
LLM Service
      |
      |
Natural Language Summary
```

---

# 🔑 配置 LLM

设置 API Key：

Windows PowerShell：

```powershell
$env:OPENAI_API_KEY="your-api-key"
$env:OPENAI_MODEL="gpt-4.1-mini"
```

然后：

```bash
npm start
```

注意：

- 不要将 API Key 提交到 GitHub
- 推荐使用环境变量管理密钥

---

# 🪟 Windows 开机启动

系统支持安装 Windows 启动快捷方式。

启动后可以自动：

1. 打开个人日程系统
2. 查询当天计划
3. 提醒重要事项
4. 检查习惯完成情况

---

# 🧠 设计理念

## Local-first

个人数据优先保存在本地：

- 降低隐私风险
- 不依赖云服务
- 保证长期可用

---

## Deterministic First, LLM Second

系统采用：

```
可靠的软件系统
        +
智能语言能力
```

其中：

代码负责：

- 时间判断
- 数据处理
- 提醒规则
- 状态管理

LLM 负责：

- 理解用户需求
- 总结分析
- 生成反馈

---

# 📌 Future Roadmap

计划支持：

- [ ] 日程自然语言输入
- [ ] AI 自动拆解任务
- [ ] 个人时间利用分析
- [ ] 长期行为趋势预测
- [ ] 多设备同步
- [ ] 本地向量数据库记忆系统
- [ ] 更智能的个人 Agent 能力

---

# License

Personal Project
