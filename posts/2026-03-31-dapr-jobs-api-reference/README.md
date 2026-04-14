# How to Use the Dapr Jobs API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, API, Scheduler, Cron

Description: A practical reference for the Dapr Jobs API covering create, get, delete, and list operations for scheduled and one-shot jobs.

---

## Overview

The Dapr Jobs API schedules persistent, durable jobs that survive pod restarts and cluster failures. Jobs are managed by the Dapr Scheduler service and support both cron-based recurring schedules and one-shot execution at a specific time.

## Base URL

```yaml
http://localhost:{daprPort}/v1.0-alpha1/jobs/{jobName}
```

## Creating a Scheduled Job

**POST** `/v1.0-alpha1/jobs/{jobName}`

Create a recurring job on a cron schedule:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@daily",
    "data": "{\"reportType\":\"sales\",\"format\":\"pdf\"}"
  }'
```

## Cron Schedule Formats

| Expression | Meaning |
|---|---|
| `@daily` | Every day at midnight |
| `@hourly` | Every hour |
| `@every 30m` | Every 30 minutes |
| `0 0 9 * * MON-FRI` | Weekdays at 9:00 AM |
| `0 0 */6 * * *` | Every 6 hours |

## Creating a One-Shot Job

Schedule a job to run once at a specific time:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/send-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "2026-04-01T09:00:00Z",
    "data": "{\"userId\":\"user-123\",\"message\":\"Your trial expires tomorrow\"}"
  }'
```

## Getting a Job

**GET** `/v1.0-alpha1/jobs/{jobName}`

```bash
curl http://localhost:3500/v1.0-alpha1/jobs/daily-report
```

Response:

```json
{
  "name": "daily-report",
  "schedule": "@daily",
  "data": "{\"reportType\":\"sales\"}"
}
```

## Deleting a Job

**DELETE** `/v1.0-alpha1/jobs/{jobName}`

```bash
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/daily-report
```

## Handling Job Triggers in Your Application

Your app receives the job callback via a POST endpoint at `/job/{jobName}`:

```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/job/daily-report', methods=['POST'])
def handle_daily_report():
    data = request.get_json()
    print(f"Running daily report job with data: {data}")
    generate_report(data)
    return {"status": "SUCCESS"}, 200
```

## Creating Jobs with the Python SDK

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._jobs import Job

with DaprClient() as client:
    job = Job(
        name="weekly-cleanup",
        schedule="0 0 2 * * SUN",
        ttl="1h"
    )
    client.schedule_job_alpha1(job)
    print("Weekly cleanup job scheduled")
```

## Repeating a Finite Number of Times

Use the `repeats` field to limit execution count:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/limited-retry \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 5m",
    "repeats": 3,
    "data": "{\"task\":\"retry-failed-payment\"}"
  }'
```

## Summary

The Dapr Jobs API provides a reliable, persistent alternative to application-level cron scheduling. Jobs survive scheduler pod restarts, support both recurring and one-shot execution, and deliver at-least-once semantics. Use it for report generation, cleanup tasks, reminder notifications, and any work that must execute on a schedule without depending on an always-running process.
