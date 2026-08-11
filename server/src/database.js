const Database = require("better-sqlite3");

const db = new Database("tasks.db");

// Users table
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
`).run();

// Tasks table
db.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0
    )
`).run();

// Check existing columns
let columns = db.prepare("PRAGMA table_info(tasks)").all();

// Add user_id if it doesn't exist
if (!columns.some(column => column.name === "user_id")) {
    db.prepare(`
        ALTER TABLE tasks
        ADD COLUMN user_id INTEGER
        REFERENCES users(id)
    `).run();
}

// Refresh columns
columns = db.prepare("PRAGMA table_info(tasks)").all();

// Add due_date if it doesn't exist
if (!columns.some(column => column.name === "due_date")) {
    db.prepare(`
        ALTER TABLE tasks
        ADD COLUMN due_date TEXT
    `).run();
}

// Refresh columns
columns = db.prepare("PRAGMA table_info(tasks)").all();

// Add reminder_at if it doesn't exist
if (!columns.some(column => column.name === "reminder_at")) {
    db.prepare(`
        ALTER TABLE tasks
        ADD COLUMN reminder_at TEXT
    `).run();
}

module.exports = db;