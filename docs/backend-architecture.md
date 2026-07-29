# Backend Architecture

## Goal

This project keeps the existing schedule website as the UI, and adds a local backend layer for persistence, desktop notifications, scheduled reminders, and LLM-powered weekly comments. It deliberately avoids a complex agent framework.

## Runtime

- Frontend: `src/index.html`
- Backend entry: `backend/server.mjs`
- Local URL: `http://127.0.0.1:5173`
- Startup launcher: `scripts/start-daily-schedule-agent.ps1`
- Frontend opener: `scripts/open-daily-schedule-site.ps1`
- Startup shortcut installer: `scripts/install-startup-agent.ps1`

## Database

The first backend version uses a local JSON database:

```text
backend/data/daily-schedule.db.json
```

This file is ignored by Git. The database module is isolated in:

```text
backend/database/jsonDatabase.mjs
```

The rest of the backend talks to the database through service functions, so the file database can later be replaced by SQLite without rewriting API handlers.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Backend health check |
| `GET` | `/api/day?date=YYYY-MM-DD` | Read one day's tasks and memos |
| `POST` | `/api/sync/day` | Sync one day's tasks and memos from the browser |
| `POST` | `/api/import/localstorage` | Import legacy `file://` localStorage days into the backend database |
| `POST` | `/api/tasks` | Create a schedule task through the backend API |
| `POST` | `/api/habits/sport` | Record whether today's sport habit is complete |
| `POST` | `/api/habits/github` | Record GitHub commit/maintenance status |
| `POST` | `/api/startup-check` | Run startup reminders for today |
| `POST` | `/api/notifications` | Send a desktop notification |
| `POST` | `/api/notifications/daily-summary-reminder` | Notify after the user closes the page without a memo |
| `GET` | `/api/weekly-summary` | Build weekly summary and LLM comment |

The backend owns deterministic decisions such as:

- Whether a task is a sport task.
- Whether a task is important.
- Whether a startup reminder has already been shown today.
- Whether Saturday/Sunday routines should run.
- When an important task reminder should fire.

## Scheduled Tasks

`backend/services/reminderScheduler.mjs` owns local scheduling:

- Startup routine asks the user to confirm today's sport task.
- Startup routine asks whether there are important tasks.
- Startup routine reminds the user about GitHub commit and maintenance.
- Important tasks are scheduled by start time when the page syncs data to the backend.
- Saturday startup shows the creation-day reminder.
- Sunday startup sends a weekly summary for last Sunday through this Saturday.
- Closing the website after 20:00 sends a backend event; the backend checks whether there are open tasks or no daily memo before showing a desktop prompt.

The reminder scheduler uses normal JavaScript timers while the backend process is running. Windows startup launches the backend automatically. Backend startup and frontend opening are decoupled: `start-daily-schedule-agent.ps1` starts the backend immediately, then delegates website opening to `open-daily-schedule-site.ps1`.

Startup timings are written to:

```text
backend/logs/startup.log
```

## Desktop Notifications

`backend/services/notificationService.mjs` uses PowerShell and `System.Windows.Forms.NotifyIcon` to show Windows desktop balloon notifications near the system tray.

This is intentionally OS-level rather than an in-page modal. Sport and important-task reminders include a click target that opens the original website URL with query parameters, then the frontend opens the existing task modal and pre-fills date, time, and category text.

The shutdown reminder uses a small desktop prompt in the lower-right corner with three choices:

- Fill: opens the website memo editor.
- Remind later: shows another reminder later.
- Exit: closes the prompt.

## LLM Module

`backend/services/llmService.mjs` calls an OpenAI-compatible Responses API when `OPENAI_API_KEY` is available:

```powershell
$env:OPENAI_API_KEY="..."
$env:OPENAI_MODEL="gpt-4.1-mini"
```

The LLM is only used for natural-language generation, summary wording, and encouragement. It does not decide task state, trigger timing, weekly date ranges, sport-task matching, or important-task matching.

If no API key is configured, the backend falls back to a local rule-based weekly comment so the system remains usable offline.

Never commit `.env` files or API keys. `.gitignore` already excludes them.
