# Smart Task Manager

A full-stack task management application with authentication, reminders, filtering, persistent storage, and local AI assistance using Ollama.

## Features

- User registration and login
- JWT authentication
- Add, edit, complete, and delete tasks
- Due date and reminder support
- Browser notifications with reminder sound
- Task filtering:
  - All
  - Pending
  - Completed
- Task statistics
- Persistent SQLite database
- AI task suggestions using Ollama
- Responsive frontend design

## AI Assistant

The AI assistant works locally using Ollama.

It can suggest:

- Improved task titles
- Task priority
- Step-by-step plans
- Estimated completion time

The AI feature currently requires Ollama to be installed and running locally.

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- SQLite
- better-sqlite3

### Authentication
- JWT
- bcryptjs

### AI
- Ollama
- Llama 3.2

## Project Structure

```text
smart-task-manager/
├── client/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── server/
│   ├── src/
│   │   ├── app.js
│   │   └── database.js
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md