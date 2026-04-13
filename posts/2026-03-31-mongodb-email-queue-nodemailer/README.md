# How to Build an Email Queue with MongoDB and Nodemailer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Email, Queue, Nodemailer, Node.js

Description: Build a reliable email queue using MongoDB as a job store and Nodemailer for delivery, with status tracking, retries, and dead-letter handling.

---

## Overview

A MongoDB-backed email queue stores outgoing emails as documents, processes them with a worker that calls Nodemailer, and tracks delivery status. Unlike in-memory queues, MongoDB provides durability - emails survive application restarts - and a queryable audit trail of every delivery attempt.

## Email Queue Schema

```javascript
const emailSchema = {
  to: "string",
  subject: "string",
  html: "string",
  text: "string",
  status: "pending | processing | sent | failed | dead",
  attempts: 0,
  maxAttempts: 3,
  scheduledAt: Date,
  lockedAt: null,
  lockedBy: null,
  sentAt: null,
  lastError: null,
  createdAt: Date,
};
```

## Enqueuing Emails

```javascript
async function enqueueEmail(db, { to, subject, html, text, delayMs = 0 }) {
  return db.collection("email_queue").insertOne({
    to,
    subject,
    html,
    text: text || "",
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: new Date(Date.now() + delayMs),
    lockedAt: null,
    lockedBy: null,
    sentAt: null,
    lastError: null,
    createdAt: new Date(),
  });
}
```

## Atomic Job Claiming

Use `findOneAndUpdate` to atomically claim a job, preventing multiple workers from processing the same email.

```javascript
const workerId = `worker-${process.pid}`;

async function claimNextEmail(db) {
  const lockExpiry = new Date(Date.now() - 5 * 60 * 1000); // 5 min lock timeout
  return db.collection("email_queue").findOneAndUpdate(
    {
      status: { $in: ["pending", "processing"] },
      scheduledAt: { $lte: new Date() },
      attempts: { $lt: 3 },
      $or: [
        { lockedAt: null },
        { lockedAt: { $lt: lockExpiry } },
      ],
    },
    {
      $set: { status: "processing", lockedAt: new Date(), lockedBy: workerId },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after", sort: { scheduledAt: 1 } }
  );
}
```

## Processing and Sending Emails

```javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function processEmail(db, job) {
  const col = db.collection("email_queue");
  try {
    await transporter.sendMail({
      from: '"MyApp" <noreply@myapp.com>',
      to: job.to,
      subject: job.subject,
      html: job.html,
      text: job.text,
    });

    await col.updateOne(
      { _id: job._id },
      { $set: { status: "sent", sentAt: new Date(), lockedAt: null, lockedBy: null } }
    );
  } catch (err) {
    const isDead = job.attempts >= job.maxAttempts;
    await col.updateOne(
      { _id: job._id },
      {
        $set: {
          status: isDead ? "dead" : "pending",
          lastError: err.message,
          lockedAt: null,
          lockedBy: null,
          scheduledAt: isDead ? job.scheduledAt : new Date(Date.now() + 60000 * job.attempts),
        },
      }
    );
  }
}
```

## Worker Loop

```javascript
async function runWorker(db) {
  console.log(`Email worker ${workerId} started`);
  while (true) {
    const job = await claimNextEmail(db);
    if (job) {
      await processEmail(db, job);
    } else {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
```

## Indexes for Queue Performance

```javascript
await db.collection("email_queue").createIndex(
  { status: 1, scheduledAt: 1, attempts: 1 },
  { name: "idx_queue_worker" }
);
await db.collection("email_queue").createIndex(
  { sentAt: 1 },
  { expireAfterSeconds: 30 * 24 * 3600, partialFilterExpression: { status: "sent" } }
);
```

## Summary

A MongoDB email queue uses atomic `findOneAndUpdate` to claim jobs without race conditions, Nodemailer to deliver messages over SMTP, and status fields with retry counters to handle transient failures. Index the queue on `status`, `scheduledAt`, and `attempts` for fast worker polling, and add a TTL index on `sentAt` to automatically purge old sent records.
