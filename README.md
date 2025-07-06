# AI Personal Task Assistant

A modern, AI-powered personal task assistant web app with smart productivity features, built using Flask (Python), SQLite, OpenAI (LLM), and a modern HTML/CSS/JS frontend.

---

## Features

- **Task Management:** Add, view, edit, delete tasks, Summerize 
- **Mark Complete/Incomplete:** Track task completion
- **Deadlines & Recurring Tasks:** Set deadlines and repeat (none/daily/weekly/monthly)
- **Custom Categories:** Add/delete categories, assign to tasks
- **AI Categorization & Priority:** OpenAI suggests category and priority for new tasks
- **Task Summarization & Suggestions:** LLM summarizes tasks and suggests subtasks
- **Task Prioritization with Reasoning:** LLM orders tasks by importance, with explanations
- **Contextual Assistant Q&A:** Ask questions; answers are aware of your current tasks (RAG)
- **Modern UI:** Beautiful, fixed-width, desktop-focused design with stylish buttons and modals
- **Browser Notifications:** (Permission requested, logic ready for reminders)

---

## Tech Stack

- **Backend:** Python, Flask, SQLite, OpenAI API
- **Frontend:** HTML, CSS (modern, desktop), JavaScript
- **AI:** OpenAI GPT-3.5-turbo (for categorization, summarization, prioritization, Q&A)

---

## How It Works

- **Add Tasks:** Enter task, select category, deadline, repeat. AI suggests category/priority.
- **Task List:** View all tasks, scrollable, with action buttons (complete, edit, delete, summarize)
- **Summarize:** Get concise summary and subtasks for any task (LLM-powered)
- **Prioritize:** See all tasks ordered by importance, with LLM explanations
- **Assistant:** Ask questions; answers use your current tasks as context
- **Categories:** Manage custom categories
- **Recurring:** Set tasks to repeat (future logic can auto-create next instance)

---

## Setup & Run

1. **Clone the repo**
2. **Backend:**
   - Install Python requirements: `pip install -r backend/requirements.txt`
   - Add your OpenAI API key to `.env` in `backend/`
   - Run Flask app: `python backend/app.py`
3. **Frontend:**
   - Open `frontend/index.html` in your browser (or serve via Flask static)

---

## File Structure

- `backend/`
  - `app.py` (Flask app, API, DB, AI logic)
  - `requirements.txt`, `.env`, `tasks.db`
- `frontend/`
  - `index.html`, `app.js`, `assistant.js`, `modern.css`

---

## Credits
- Built by Muhammad (and GitHub Copilot)
- Powered by OpenAI

---

## Future Ideas
- Email notifications
- Voice input
- Analytics & stats
- Export/import tasks
- Dark mode

---

Enjoy your smart, modern AI task assistant!
