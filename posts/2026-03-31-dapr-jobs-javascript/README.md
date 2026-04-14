# How to Use Dapr Jobs with JavaScript SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, JavaScript, Node.js, Scheduler

Description: Learn how to schedule and manage one-time and recurring jobs in Node.js using the Dapr Jobs API for durable, reliable task execution.

---

## Introduction

Dapr Jobs provides a durable job scheduling API that persists job definitions so they survive restarts. The JavaScript SDK makes it straightforward to schedule work to run once or on a recurring schedule from your Node.js applications.

## Installing the SDK

```bash
npm install @dapr/dapr
```

## Creating a Client

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: process.env.DAPR_HTTP_PORT || "3500",
});
```

## Scheduling a One-Time Job

```javascript
async function scheduleReport() {
  await client.jobs.schedule("monthly-report", {
    data: { reportType: "monthly", format: "pdf" },
    dueTime: "30s",
  });
  console.log("Report job scheduled");
}
```

## Scheduling a Recurring Job

Use cron syntax for recurring schedules:

```javascript
async function scheduleCleanup() {
  await client.jobs.schedule("daily-cleanup", {
    data: { olderThanDays: 30 },
    schedule: "0 0 3 * * *",  // 3 AM daily (6-field cron with seconds)
  });
  console.log("Cleanup job scheduled");
}
```

## Handling Job Triggers

Register a handler using `DaprServer`:

```javascript
const { DaprServer } = require("@dapr/dapr");

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3001",
  clientOptions: { daprHost: "127.0.0.1", daprPort: "3501" },
});

// Handle job by name
await server.jobs.listen("monthly-report", async (data) => {
  console.log("Generating report:", data.reportType);
  await generateReport(data);
});

await server.jobs.listen("daily-cleanup", async (data) => {
  console.log("Running cleanup, older than:", data.olderThanDays, "days");
  await cleanupRecords(data.olderThanDays);
});

await server.start();
```

## Getting Job Details

```javascript
const job = await client.jobs.get("monthly-report");
console.log("Job name:", job.name);
console.log("Schedule:", job.schedule);
```

## Deleting a Job

Cancel a job when it is no longer needed:

```javascript
await client.jobs.delete("monthly-report");
console.log("Job cancelled");
```

## Dapr Configuration for Jobs

The Jobs API requires the Dapr Scheduler service to be running. When using the Dapr CLI for local development, the Scheduler service starts automatically with `dapr init`. No additional feature flags or configuration are needed.

## Running the Application

```bash
dapr run \
  --app-id job-service \
  --app-port 3001 \
  -- node app.js
```

## Summary

Dapr Jobs in the JavaScript SDK gives Node.js applications a reliable way to schedule one-time and recurring tasks without managing cron infrastructure. Jobs persist across restarts, and the handler model keeps scheduling logic cleanly separated from execution logic.
