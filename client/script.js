const API_URL = "http://localhost:3000";

const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");
const taskSection = document.getElementById("taskSection");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

const registerName = document.getElementById("registerName");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const registerBtn = document.getElementById("registerBtn");
const registerMessage = document.getElementById("registerMessage");

const showRegisterBtn = document.getElementById("showRegisterBtn");
const showLoginBtn = document.getElementById("showLoginBtn");

const taskInput = document.getElementById("taskInput");
const dueDateInput = document.getElementById("dueDateInput");
const reminderInput = document.getElementById("reminderInput");

const addTaskBtn = document.getElementById("addTaskBtn");

const askAiBtn = document.getElementById("askAiBtn");
const aiResult = document.getElementById("aiResult");

const taskList = document.getElementById("taskList");
const logoutBtn = document.getElementById("logoutBtn");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const completedCount = document.getElementById("completedCount");

const filterButtons = document.querySelectorAll("#filters button");

let token = localStorage.getItem("token");

let allTasks = [];
let currentFilter = "all";

const notifiedReminders = new Set();

let audioContext = null;


// =========================
// PAGES
// =========================

function showLoginPage() {
    loginSection.style.display = "block";
    registerSection.style.display = "none";
    taskSection.style.display = "none";
}

function showRegisterPage() {
    loginSection.style.display = "none";
    registerSection.style.display = "block";
    taskSection.style.display = "none";
}

function showTasksPage() {
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    taskSection.style.display = "block";
}


// =========================
// NOTIFICATION SOUND
// =========================

function enableReminderSound() {
    if (!audioContext) {
        audioContext = new (
            window.AudioContext ||
            window.webkitAudioContext
        )();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
}

function playReminderSound() {
    if (!audioContext) return;

    function playBeep(frequency, delay) {
        setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.type = "sine";
            oscillator.frequency.value = frequency;

            gain.gain.setValueAtTime(
                0.25,
                audioContext.currentTime
            );

            oscillator.start();

            oscillator.stop(
                audioContext.currentTime + 0.35
            );
        }, delay);
    }

    playBeep(880, 0);
    playBeep(1100, 450);
    playBeep(880, 900);
}

async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        return;
    }

    if (Notification.permission === "default") {
        await Notification.requestPermission();
    }
}

function checkReminders() {
    if (!("Notification" in window)) {
        return;
    }

    const now = new Date();

    allTasks.forEach(task => {
        if (!task.reminder_at || task.completed) {
            return;
        }

        const reminderTime = new Date(task.reminder_at);

        const reminderKey =
            `${task.id}-${task.reminder_at}`;

        const difference =
            now.getTime() - reminderTime.getTime();

        if (
            difference >= 0 &&
            difference <= 5 * 60 * 1000 &&
            !notifiedReminders.has(reminderKey)
        ) {
            notifiedReminders.add(reminderKey);

            if (Notification.permission === "granted") {
                new Notification("Task Reminder 🔔", {
                    body: task.title
                });
            }

            playReminderSound();
        }
    });
}


// =========================
// REGISTER
// =========================

async function register() {
    const name = registerName.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();

    if (!name || !email || !password) {
        registerMessage.textContent =
            "Please fill in all fields";

        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            registerMessage.textContent =
                data.message || "Registration failed";

            return;
        }

        registerMessage.textContent =
            "Account created successfully. Please login.";

        registerName.value = "";
        registerEmail.value = "";
        registerPassword.value = "";

        setTimeout(() => {
            registerMessage.textContent = "";
            showLoginPage();
        }, 1000);

    } catch (error) {
        registerMessage.textContent =
            "Cannot connect to server";
    }
}


// =========================
// LOGIN
// =========================

async function login() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        loginMessage.textContent =
            "Please enter email and password";

        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            loginMessage.textContent =
                data.message || "Login failed";

            return;
        }

        token = data.token;

        localStorage.setItem(
            "token",
            token
        );

        loginMessage.textContent = "";

        enableReminderSound();

        await requestNotificationPermission();

        showTasksPage();

        loadTasks();

    } catch (error) {
        loginMessage.textContent =
            "Cannot connect to server";
    }
}


// =========================
// FORMAT AI RESPONSE
// =========================

function formatAIResponse(text) {
    if (!text) {
        return `
            <div class="ai-header">
                ✨ AI Suggestion
            </div>
            <p>No suggestion returned.</p>
        `;
    }

    let formatted = text;

    // Remove markdown bold
    formatted = formatted.replace(/\*\*/g, "");

    // Improved Task Title
    formatted = formatted.replace(
        /Improved Task Title:/gi,
        "<br><strong>Improved Task:</strong> "
    );

    // Priority
    formatted = formatted.replace(
        /Priority:/gi,
        "<br><strong>Priority:</strong> "
    );

    // Steps
    formatted = formatted.replace(
        /Steps:/gi,
        "<br><br><strong>Steps:</strong><br>"
    );

    // Estimated Completion Time
    formatted = formatted.replace(
        /Estimated Completion Time:/gi,
        "<br><br><strong>Estimated Time:</strong> "
    );

    // Estimated Time
    formatted = formatted.replace(
        /Estimated Time:/gi,
        "<br><strong>Estimated Time:</strong> "
    );

    // Numbered steps
    formatted = formatted.replace(
        /(\d+\.\s)/g,
        "<br>$1"
    );

    // New lines
    formatted = formatted.replace(/\n/g, "<br>");

    return `
        <div class="ai-header">
            ✨ AI Suggestion
        </div>

        <div class="ai-content">
            ${formatted}
        </div>
    `;
}


// =========================
// AI
// =========================

async function askAI() {
    const task = taskInput.value.trim();

    if (!task) {
        aiResult.classList.add("show");

        aiResult.innerHTML = `
            <div class="ai-header">
                ⚠️ Enter a task first
            </div>
        `;

        return;
    }

    if (!token) {
        aiResult.classList.add("show");

        aiResult.innerHTML = `
            <div class="ai-header">
                Please login first
            </div>
        `;

        return;
    }

    askAiBtn.disabled = true;
    askAiBtn.textContent = "Thinking... 🤖";

    aiResult.classList.add("show");

    aiResult.innerHTML = `
        <div class="ai-header">
            🤖 AI is thinking...
        </div>

        <p>
            Ollama is generating a suggestion.
            This may take a few seconds.
        </p>
    `;

    try {
        const response = await fetch(
            `${API_URL}/ai/suggest`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify({
                    task
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            aiResult.innerHTML = `
                <div class="ai-header">
                    ❌ AI Error
                </div>

                <p>
                    ${data.message || "AI request failed"}
                </p>
            `;

            return;
        }

        aiResult.innerHTML =
            formatAIResponse(
                data.suggestion
            );

    } catch (error) {
        console.error(error);

        aiResult.innerHTML = `
            <div class="ai-header">
                ❌ Could not connect to AI
            </div>

            <p>
                Make sure the server and Ollama are running.
            </p>
        `;
    } finally {
        askAiBtn.disabled = false;
        askAiBtn.textContent = "✨ Ask AI";
    }
}


// =========================
// STATS
// =========================

function updateStats() {
    const total = allTasks.length;

    const completed = allTasks.filter(
        task => task.completed
    ).length;

    const pending =
        total - completed;

    totalCount.textContent =
        `Total: ${total}`;

    pendingCount.textContent =
        `Pending: ${pending}`;

    completedCount.textContent =
        `Completed: ${completed}`;
}


// =========================
// DATE FORMAT
// =========================

function formatDate(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    return date.toLocaleString();
}


// =========================
// RENDER TASKS
// =========================

function renderTasks() {
    taskList.innerHTML = "";

    let filteredTasks = allTasks;

    if (currentFilter === "pending") {
        filteredTasks =
            allTasks.filter(
                task => !task.completed
            );
    }

    if (currentFilter === "completed") {
        filteredTasks =
            allTasks.filter(
                task => task.completed
            );
    }

    filteredTasks.forEach(task => {
        const li =
            document.createElement("li");

        const checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = task.completed;


        const content =
            document.createElement("div");

        content.style.flex = "1";


        const title =
            document.createElement("span");

        title.textContent = task.title;

        if (task.completed) {
            title.style.textDecoration =
                "line-through";
        }

        content.appendChild(title);


        if (task.due_date) {
            const due =
                document.createElement("small");

            due.style.display = "block";
            due.style.marginTop = "6px";

            due.textContent =
                `Due: ${formatDate(task.due_date)}`;

            content.appendChild(due);
        }


        if (task.reminder_at) {
            const reminder =
                document.createElement("small");

            reminder.style.display = "block";
            reminder.style.marginTop = "4px";

            reminder.textContent =
                `Reminder: ${formatDate(task.reminder_at)}`;

            content.appendChild(reminder);
        }


        // COMPLETE TASK

        checkbox.addEventListener(
            "change",
            async () => {

                await fetch(
                    `${API_URL}/tasks/${task.id}`,
                    {
                        method: "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`
                        },

                        body: JSON.stringify({
                            completed:
                                checkbox.checked
                        })
                    }
                );

                loadTasks();
            }
        );


        // EDIT TASK

        const editBtn =
            document.createElement("button");

        editBtn.textContent = "Edit";

        editBtn.addEventListener(
            "click",
            async () => {

                const newTitle =
                    prompt(
                        "Edit task:",
                        task.title
                    );

                if (
                    !newTitle ||
                    !newTitle.trim()
                ) {
                    return;
                }

                await fetch(
                    `${API_URL}/tasks/${task.id}`,
                    {
                        method: "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`
                        },

                        body: JSON.stringify({
                            title:
                                newTitle.trim()
                        })
                    }
                );

                loadTasks();
            }
        );


        // DELETE TASK

        const deleteBtn =
            document.createElement("button");

        deleteBtn.textContent = "Delete";

        deleteBtn.addEventListener(
            "click",
            async () => {

                await fetch(
                    `${API_URL}/tasks/${task.id}`,
                    {
                        method: "DELETE",

                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

                loadTasks();
            }
        );


        li.appendChild(checkbox);
        li.appendChild(content);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);

        taskList.appendChild(li);
    });
}


// =========================
// LOAD TASKS
// =========================

async function loadTasks() {
    try {
        const response = await fetch(
            `${API_URL}/tasks`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            logout();
            return;
        }

        allTasks =
            await response.json();

        updateStats();
        renderTasks();
        checkReminders();

    } catch (error) {
        console.error(
            "Failed to load tasks",
            error
        );
    }
}


// =========================
// ADD TASK
// =========================

async function addTask() {
    const title =
        taskInput.value.trim();

    const dueDate =
        dueDateInput.value;

    const reminderAt =
        reminderInput.value;

    if (!title) {
        return;
    }

    enableReminderSound();

    await requestNotificationPermission();

    const response = await fetch(
        `${API_URL}/tasks`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json",

                Authorization:
                    `Bearer ${token}`
            },

            body: JSON.stringify({
                title,
                due_date:
                    dueDate || null,

                reminder_at:
                    reminderAt || null
            })
        }
    );

    if (!response.ok) {
        console.error(
            "Failed to add task"
        );

        return;
    }

    taskInput.value = "";
    dueDateInput.value = "";
    reminderInput.value = "";

    aiResult.textContent = "";
    aiResult.classList.remove("show");

    loadTasks();
}


// =========================
// LOGOUT
// =========================

function logout() {
    token = null;

    localStorage.removeItem(
        "token"
    );

    taskList.innerHTML = "";

    allTasks = [];

    aiResult.innerHTML = "";
    aiResult.classList.remove("show");

    showLoginPage();
}


// =========================
// FILTERS
// =========================

filterButtons.forEach(button => {
    button.addEventListener(
        "click",
        () => {

            currentFilter =
                button.dataset.filter;

            renderTasks();
        }
    );
});


// =========================
// EVENTS
// =========================

showRegisterBtn.addEventListener(
    "click",
    showRegisterPage
);

showLoginBtn.addEventListener(
    "click",
    showLoginPage
);

registerBtn.addEventListener(
    "click",
    register
);

loginBtn.addEventListener(
    "click",
    login
);

askAiBtn.addEventListener(
    "click",
    askAI
);

addTaskBtn.addEventListener(
    "click",
    addTask
);

logoutBtn.addEventListener(
    "click",
    logout
);

taskInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            addTask();
        }
    }
);


// Enable sound after user interaction

document.addEventListener(
    "click",
    enableReminderSound,
    {
        once: true
    }
);


// Check reminders every 15 seconds

setInterval(
    checkReminders,
    15000
);


// =========================
// START APP
// =========================

if (token) {
    showTasksPage();
    loadTasks();
} else {
    showLoginPage();
}