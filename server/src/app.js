require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool, initializeDatabase } = require("./database");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const clientDirectory = path.resolve(__dirname, "../../client");

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set and contain at least 32 characters");
}

if (process.env.CLIENT_ORIGIN) {
    app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
}

app.use(express.json({ limit: "100kb" }));
app.use(express.static(clientDirectory));

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function authMiddleware(req, res, next) {
    const match = req.headers.authorization?.match(/^Bearer\s+(.+)$/);

    if (!match) {
        return res.status(401).json({ message: "No valid token provided" });
    }

    try {
        const decoded = jwt.verify(match[1], JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ message: "Invalid token" });
    }
}

app.get("/health", asyncRoute(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
}));

app.post("/register", asyncRoute(async (req, res) => {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
            message: "Name, email, and a password of at least 8 characters are required"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const result = await pool.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING id, name, email`,
            [name, email, hashedPassword]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ message: "Email already exists" });
        }
        throw error;
    }
}));

app.post("/login", asyncRoute(async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await pool.query(
        "SELECT id, password FROM users WHERE email = $1",
        [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
}));

app.get("/tasks", authMiddleware, asyncRoute(async (req, res) => {
    const result = await pool.query(
        `SELECT id, title, completed, due_date, reminder_at
         FROM tasks WHERE user_id = $1 ORDER BY id DESC`,
        [req.userId]
    );
    res.json(result.rows);
}));

app.post("/tasks", authMiddleware, asyncRoute(async (req, res) => {
    const title = req.body.title?.trim();
    if (!title) {
        return res.status(400).json({ message: "Title is required" });
    }

    const result = await pool.query(
        `INSERT INTO tasks (title, user_id, due_date, reminder_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id, title, completed, due_date, reminder_at`,
        [title, req.userId, req.body.due_date || null, req.body.reminder_at || null]
    );
    res.status(201).json(result.rows[0]);
}));

app.patch("/tasks/:id", authMiddleware, asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ message: "Invalid task id" });
    }

    const existing = await pool.query(
        "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
        [id, req.userId]
    );
    const task = existing.rows[0];
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }

    const title = req.body.title === undefined ? task.title : req.body.title?.trim();
    if (!title) {
        return res.status(400).json({ message: "Title is required" });
    }

    const values = [
        title,
        req.body.completed === undefined ? task.completed : Boolean(req.body.completed),
        req.body.due_date === undefined ? task.due_date : req.body.due_date,
        req.body.reminder_at === undefined ? task.reminder_at : req.body.reminder_at,
        id,
        req.userId
    ];
    const result = await pool.query(
        `UPDATE tasks SET title = $1, completed = $2, due_date = $3, reminder_at = $4
         WHERE id = $5 AND user_id = $6
         RETURNING id, title, completed, due_date, reminder_at`,
        values
    );
    res.json(result.rows[0]);
}));

app.delete("/tasks/:id", authMiddleware, asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ message: "Invalid task id" });
    }

    const result = await pool.query(
        "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id",
        [id, req.userId]
    );
    if (!result.rowCount) {
        return res.status(404).json({ message: "Task not found" });
    }
    res.json({ message: "Task deleted successfully" });
}));

app.post("/ai/suggest", authMiddleware, (_req, res) => {
    res.status(503).json({ message: "AI suggestions are temporarily disabled" });
});

app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
});

async function start() {
    await initializeDatabase();
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server is listening on port ${PORT}`);
    });
}

if (require.main === module) {
    start().catch((error) => {
        console.error("Failed to start server:", error);
        process.exit(1);
    });
}

module.exports = { app, start };
