# 个人日程表

一个本地运行的个人日程计划网页，支持日程新增、编辑、完成、删除、时间线拖拽、月度/年度汇总和历史日期回看。项目使用原生 HTML、CSS、JavaScript 编写，不需要后端服务或数据库，数据保存在浏览器 `localStorage` 中。

## 功能

- 新增、查看、完成、删除所选日期的日程
- 06:00 到 24:00 的纵向时间线
- 点击时间线空白区域快速创建日程
- 拖动日程块修改开始时间
- 拖动日程块上下边缘调整时长
- 支持 `105` 或 `1h45min` 这类时长输入
- 蓝色/粉色马卡龙日程色块交替显示
- 月度日历回看历史日期
- 月度和年度数据汇总
- 所有数据仅保存在本机浏览器

## 项目结构

```text
DailySchedule/
├─ public/
│  └─ icon/
│     ├─ icon.ico
│     └─ icon.png
├─ scripts/
│  ├─ check.mjs
│  └─ serve.mjs
├─ src/
│  └─ index.html
├─ .gitignore
├─ package.json
├─ README.md
└─ schedule.html
```

`schedule.html` 是兼容旧桌面快捷方式的跳转入口，正式源码在 `src/index.html`。

## 本地运行

项目不需要安装 npm 依赖。进入项目目录后运行：

```bash
npm start
```

默认地址：

```text
http://localhost:5173
```

如果端口被占用，可以指定其他端口：

```bash
PORT=5180 npm start
```

Windows PowerShell 可使用：

```powershell
$env:PORT=5180; npm start
```

## 代码检查

运行基础脚本语法检查：

```bash
npm run check
```

## 数据说明

日程数据保存在浏览器 `localStorage` 中，键名格式为：

```text
daily-schedule:YYYY-MM-DD
```

同一个浏览器、同一个访问地址下可以回看历史数据。清理浏览器站点数据会删除这些本地日程。

## 上传 GitHub

初始化和首个提交已可用后，可以在 GitHub 创建一个空仓库，然后执行：

```bash
git remote add origin <你的仓库地址>
git branch -M main
git push -u origin main
```

仓库地址示例：

```text
https://github.com/your-name/daily-schedule.git
```
