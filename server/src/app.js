require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid token"
        });
    }
}

// REGISTER
app.post("/register", (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const existingUser = db
        .prepare("SELECT * FROM users WHERE email = ?")
        .get(email);

    if (existingUser) {
        return res.status(400).json({
            message: "Email already exists"
        });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db
        .prepare(`
            INSERT INTO users (name, email, password)
            VALUES (?, ?, ?)
        `)
        .run(name, email, hashedPassword);

    res.status(201).json({
        id: result.lastInsertRowid,
        name,
        email
    });
});

// LOGIN
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const user = db
        .prepare("SELECT * FROM users WHERE email = ?")
        .get(email);

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const passwordMatches = bcrypt.compareSync(
        password,
        user.password
    );

    if (!passwordMatches) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({
        message: "Login successful",
        token
    });
});

// GET TASKS
app.get("/tasks", authMiddleware, (req, res) => {
    const tasks = db
        .prepare(`
            SELECT *
            FROM tasks
            WHERE user_id = ?
        `)
        .all(req.userId);

    const formattedTasks = tasks.map(task => ({
        ...task,
        completed: Boolean(task.completed)
    }));

    res.json(formattedTasks);
});

// ADD TASK
app.post("/tasks", authMiddleware, (req, res) => {
    const {
        title,
        due_date,
        reminder_at
    } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({
            message: "Title is required"
        });
    }

    const result = db
        .prepare(`
            INSERT INTO tasks (
                title,
                completed,
                user_id,
                due_date,
                reminder_at
            )
            VALUES (?, ?, ?, ?, ?)
        `)
        .run(
            title.trim(),
            0,
            req.userId,
            due_date || null,
            reminder_at || null
        );

    const newTask = db
        .prepare(`
            SELECT *
            FROM tasks
            WHERE id = ?
        `)
        .get(result.lastInsertRowid);

    newTask.completed = Boolean(newTask.completed);

    res.status(201).json(newTask);
});

// UPDATE TASK
app.patch("/tasks/:id", authMiddleware, (req, res) => {
    const id = Number(req.params.id);

    const task = db
        .prepare(`
            SELECT *
            FROM tasks
            WHERE id = ?
            AND user_id = ?
        `)
        .get(id, req.userId);

    if (!task) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    const title =
        req.body.title !== undefined
            ? req.body.title
            : task.title;

    const completed =
        req.body.completed !== undefined
            ? (req.body.completed ? 1 : 0)
            : task.completed;

    const dueDate =
        req.body.due_date !== undefined
            ? req.body.due_date
            : task.due_date;

    const reminderAt =
        req.body.reminder_at !== undefined
            ? req.body.reminder_at
            : task.reminder_at;

    db.prepare(`
        UPDATE tasks
        SET
            title = ?,
            completed = ?,
            due_date = ?,
            reminder_at = ?
        WHERE id = ?
        AND user_id = ?
    `).run(
        title,
        completed,
        dueDate,
        reminderAt,
        id,
        req.userId
    );

    const updatedTask = db
        .prepare(`
            SELECT *
            FROM tasks
            WHERE id = ?
        `)
        .get(id);

    updatedTask.completed = Boolean(
        updatedTask.completed
    );

    res.json(updatedTask);
});

// DELETE TASK
app.delete("/tasks/:id", authMiddleware, (req, res) => {
    const id = Number(req.params.id);

    const task = db
        .prepare(`
            SELECT *
            FROM tasks
            WHERE id = ?
            AND user_id = ?
        `)
        .get(id, req.userId);

    if (!task) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    db.prepare(`
        DELETE FROM tasks
        WHERE id = ?
        AND user_id = ?
    `).run(id, req.userId);

    res.json({
        message: "Task deleted successfully"
    });
});

// OLLAMA AI ASSISTANT
app.post("/ai/suggest", authMiddleware, async (req, res) => {
    try {
        const { task } = req.body;

        if (!task || !task.trim()) {
            return res.status(400).json({
                message: "Task is required"
            });
        }

        const prompt = `
You are an AI assistant inside a Task Manager application.

The user's task is:

"${task}"

Give a concise and useful response with:

1. Improved Task Title
2. Priority: Low, Medium, or High
3. 3 to 5 simple steps
4. Estimated completion time

Keep it practical and easy to read.
`;

        const ollamaResponse = await fetch(
            "http://localhost:11434/api/generate",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3.2:3b",
                    prompt: prompt,
                    stream: false
                })
            }
        );

        if (!ollamaResponse.ok) {
            throw new Error(
                `Ollama error: ${ollamaResponse.status}`
            );
        }

        const data = await ollamaResponse.json();

        res.json({
            suggestion: data.response
        });

    } catch (error) {
        console.error("Ollama error:", error);

        res.status(500).json({
            message: "AI request failed. Make sure Ollama is running."
        });
    }
});

app.listen(PORT, () => {
    console.log(
        `Server is running on http://localhost:${PORT}`
    );
});