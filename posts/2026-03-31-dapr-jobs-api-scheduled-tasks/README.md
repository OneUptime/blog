# How to Use Dapr Jobs API for Scheduled Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Scheduling, Cron, Microservice

Description: Learn how to use Dapr's Jobs API to schedule and manage recurring and one-time tasks using cron expressions, replacing external schedulers in microservice architectures.

---

## Introduction

Dapr's Jobs API (alpha in Dapr 1.14+) provides a distributed job scheduling building block. You can schedule one-shot or recurring jobs using cron expressions or durations, and Dapr will invoke a callback on your application at the scheduled time. Unlike actor reminders (which are per-actor-instance), Jobs are application-level scheduled tasks.

Use cases:
- Database cleanup or archival jobs
- Periodic report generation
- Scheduled notifications or emails
- Data synchronization tasks
- Regular health checks or audits

## Architecture

```mermaid
flowchart LR
    App[Application] -->|Schedule job via API| Sidecar[Dapr Sidecar]
    Sidecar -->|Register job| Scheduler[Dapr Scheduler Service]
    Scheduler -->|At scheduled time| Sidecar2[Dapr Sidecar]
    Sidecar2 -->|POST /job/{jobName}| App2[Application]
```

## Prerequisites

- Dapr v1.14 or later (Jobs API)
- Dapr Scheduler service deployed (installed with `dapr init -k`)

## Step 1: Verify Scheduler Service is Running

```bash
kubectl get pods -n dapr-system -l app=dapr-scheduler

dapr status -k | grep scheduler
```

## Step 2: Schedule a Job via HTTP API

### One-Shot Job (Runs Once)

```bash
curl -X POST \
  http://localhost:3500/v1.0-alpha1/jobs/cleanup-old-data \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "2026-04-01T02:00:00Z",
    "data": {
      "type": "cleanup",
      "olderThanDays": 30,
      "table": "audit_logs"
    }
  }'
```

### Recurring Job (Cron Expression)

```bash
curl -X POST \
  http://localhost:3500/v1.0-alpha1/jobs/daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 6 * * *",
    "data": {
      "type": "report",
      "recipients": ["team@example.com"]
    }
  }'
```

Cron expression format: `minute hour day-of-month month day-of-week`

Common schedules:
- `0 * * * *` - every hour at minute 0
- `*/5 * * * *` - every 5 minutes
- `0 6 * * 1-5` - weekdays at 6 AM
- `@daily` - every day at midnight
- `@hourly` - every hour

### Job with Repeat Count

```bash
curl -X POST \
  http://localhost:3500/v1.0-alpha1/jobs/welcome-email-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 24h",
    "repeats": 7,
    "data": {
      "campaignId": "onboarding-2026",
      "emailTemplate": "welcome"
    }
  }'
```

## Step 3: Implement the Job Callback in Your Application

When a job fires, Dapr calls `POST /job/{jobName}` on your application:

### Node.js

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Job callback endpoint
app.post('/job/:jobName', async (req, res) => {
  const { jobName } = req.params;
  const jobData = req.body;

  console.log(`Job '${jobName}' triggered:`, jobData);

  switch (jobName) {
    case 'daily-report':
      await generateDailyReport(jobData);
      break;
    case 'cleanup-old-data':
      await cleanupOldData(jobData);
      break;
    default:
      console.warn(`Unknown job: ${jobName}`);
  }

  res.sendStatus(200);
});

async function generateDailyReport(data) {
  console.log(`Generating report for recipients: ${data.recipients}`);
  // Report generation logic
}

async function cleanupOldData(data) {
  console.log(`Cleaning up ${data.table} older than ${data.olderThanDays} days`);
  // Cleanup logic
}

app.listen(3000, () => console.log('App running on :3000'));
```

### Python

```python
from flask import Flask, request, jsonify
import logging

app = Flask(__name__)
logger = logging.getLogger(__name__)

@app.route('/job/<job_name>', methods=['POST'])
def handle_job(job_name):
    job_data = request.get_json()
    logger.info(f"Job '{job_name}' triggered: {job_data}")

    if job_name == 'daily-report':
        generate_daily_report(job_data)
    elif job_name == 'cleanup-old-data':
        cleanup_old_data(job_data)
    else:
        logger.warning(f"Unknown job: {job_name}")

    return jsonify({'status': 'ok'}), 200

def generate_daily_report(data):
    logger.info(f"Generating report for {data.get('recipients', [])}")

def cleanup_old_data(data):
    logger.info(f"Cleaning {data.get('table')} older than {data.get('olderThanDays')} days")

if __name__ == '__main__':
    app.run(port=3000)
```

### Go

```go
package main

import (
    "encoding/json"
    "io"
    "log"
    "net/http"
)

func jobHandler(w http.ResponseWriter, r *http.Request) {
    jobName := r.PathValue("jobName")
    body, _ := io.ReadAll(r.Body)

    var jobData map[string]interface{}
    json.Unmarshal(body, &jobData)

    log.Printf("Job '%s' triggered: %+v", jobName, jobData)

    switch jobName {
    case "daily-report":
        generateDailyReport(jobData)
    case "cleanup-old-data":
        cleanupOldData(jobData)
    default:
        log.Printf("Unknown job: %s", jobName)
    }

    w.WriteHeader(http.StatusOK)
}

func generateDailyReport(data map[string]interface{}) {
    log.Printf("Generating daily report: %+v", data)
}

func cleanupOldData(data map[string]interface{}) {
    log.Printf("Cleaning up old data: %+v", data)
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /job/{jobName}", jobHandler)
    log.Fatal(http.ListenAndServe(":3000", mux))
}
```

## Step 4: Manage Jobs

### Get a Job

```bash
curl http://localhost:3500/v1.0-alpha1/jobs/daily-report
```

Response:

```json
{
  "name": "daily-report",
  "schedule": "0 6 * * *",
  "data": {"type": "report", "recipients": ["team@example.com"]}
}
```

### Delete a Job

```bash
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/daily-report
```

## Step 5: Run Your Application with Dapr

```bash
dapr run \
  --app-id scheduler-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  -- node app.js
```

## Summary

Dapr's Jobs API provides a distributed job scheduler that eliminates the need for external cron infrastructure. Schedule one-shot or recurring jobs via the HTTP API using cron expressions or duration strings. Implement a `POST /job/{jobName}` endpoint in your application to handle callbacks. Manage job lifecycle with GET and DELETE operations. The Dapr Scheduler service handles job persistence and delivery, ensuring jobs fire even when your application is restarted between scheduled runs.
