# How to Use Redis for Express.js Background Job Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Express, BullMQ, Background Job, Node.js

Description: Add background job processing to Express.js using BullMQ and Redis to offload slow tasks like email sending and report generation from request handlers.

---

Background jobs prevent slow operations - sending emails, resizing images, generating reports - from blocking Express.js request handlers. BullMQ uses Redis as its backing store, providing persistent queues, job retries, and concurrency control.

## Install Dependencies

```bash
npm install express bullmq ioredis
```

## Define Queues and Workers

Create `queues/emailQueue.js`:

```javascript
const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis({ host: "localhost", port: 6379, maxRetriesPerRequest: null });

// Queue definition
const emailQueue = new Queue("email", { connection });

// Worker processes jobs
const emailWorker = new Worker(
  "email",
  async (job) => {
    const { to, subject, body } = job.data;
    console.log(`Sending email to ${to}: ${subject}`);
    // await sendEmail(to, subject, body);
    return { sent: true };
  },
  { connection, concurrency: 5 }
);

emailWorker.on("completed", (job) => console.log(`Job ${job.id} completed`));
emailWorker.on("failed", (job, err) => console.error(`Job ${job.id} failed: ${err.message}`));

module.exports = emailQueue;
```

## Enqueue Jobs from Express Routes

```javascript
const express = require("express");
const emailQueue = require("./queues/emailQueue");

const app = express();
app.use(express.json());

app.post("/register", async (req, res) => {
  const { email, name } = req.body;

  // Respond immediately - do not wait for email to send
  const job = await emailQueue.add(
    "welcome-email",
    { to: email, subject: "Welcome!", body: `Hi ${name}` },
    { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
  );

  res.status(201).json({ userId: "new-user-id", jobId: job.id });
});

app.get("/jobs/:id", async (req, res) => {
  const job = await emailQueue.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const state = await job.getState();
  res.json({ id: job.id, state, result: job.returnvalue });
});
```

## Schedule Delayed Jobs

```javascript
// Send a reminder email in 24 hours
await emailQueue.add(
  "reminder",
  { to: "user@example.com", subject: "Reminder" },
  { delay: 24 * 60 * 60 * 1000 }
);
```

## Monitor with Bull Board

```bash
npm install @bull-board/express @bull-board/api
```

```javascript
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());
```

Visit `http://localhost:3000/admin/queues` to inspect jobs visually.

## Summary

BullMQ with Redis decouples slow background work from Express.js request handling. Jobs are persisted in Redis so they survive server restarts, and built-in retry with exponential backoff handles transient failures automatically. Bull Board provides a real-time UI for monitoring queue health without writing custom admin code.
