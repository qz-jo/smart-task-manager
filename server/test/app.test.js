const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL = "postgresql://unused:unused@localhost:5432/unused";
process.env.JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";

const { app } = require("../src/app");

test("serves the frontend from the root path", async () => {
    const server = app.listen(0, "127.0.0.1");

    try {
        await new Promise((resolve) => server.once("listening", resolve));
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/`);

        assert.equal(response.status, 200);
        assert.match(await response.text(), /Task Manager/i);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
