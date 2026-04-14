# How to Schedule a Job Using Dapr Jobs API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Scheduling, Cron, Automation, Background Task

Description: Learn how to schedule jobs using the Dapr Jobs API with cron expressions and interval schedules, and handle job triggers in your application.

---

## What Is the Dapr Jobs API?

The Dapr Jobs API (formerly the Scheduler building block) allows you to schedule jobs to run at a specific time, after a delay, or on a recurring schedule using cron expressions. Jobs are stored durably in the Dapr Scheduler service, so they survive application restarts.

When a job triggers, Dapr calls your application via an HTTP endpoint, delivering the job's payload.

## Prerequisites

Dapr 1.14 or later with the Scheduler service running:

```bash
# Check Scheduler is running
kubectl get pods -n dapr-system | grep scheduler
# dapr-scheduler-server-0    Running

# Or for self-hosted
dapr run --app-id scheduler-test -- echo "Dapr with scheduler"
```

## Scheduling a Job via HTTP API

```bash
# Schedule a job to run every hour
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/hourly-report \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 1h",
    "data": {
      "reportType": "sales"
    }
  }'
```

The `data` field accepts any JSON-serializable value or object.

## Scheduling a Job via Go SDK

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    daprc "github.com/dapr/go-sdk/client"
    "google.golang.org/protobuf/types/known/anypb"
)

func scheduleJob(jobName string, schedule string, data map[string]any) error {
    client, err := daprc.NewClient()
    if err != nil {
        return err
    }
    defer client.Close()

    jobData, _ := json.Marshal(data)

    job := daprc.NewJob(jobName,
        daprc.WithJobSchedule(schedule),
        daprc.WithJobData(&anypb.Any{Value: jobData}),
    )

    return client.ScheduleJobAlpha1(context.Background(), job)
}

func main() {
    // Schedule daily report at 9am UTC
    err := scheduleJob("daily-sales-report", "0 9 * * *", map[string]any{
        "reportType": "sales",
        "recipients":  []string{"manager@example.com"},
    })
    if err != nil {
        log.Fatalf("Failed to schedule job: %v", err)
    }
    log.Println("Job scheduled successfully")
}
```

## Scheduling a Job via Python SDK

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._jobs import Job
from google.protobuf.any_pb2 import Any as GrpcAny
import json

def schedule_job(name: str, schedule: str, data: dict):
    with DaprClient() as d:
        job_data = GrpcAny(value=json.dumps(data).encode("utf-8"))

        job = Job(name=name, schedule=schedule, data=job_data)
        d.schedule_job_alpha1(job)
        print(f"Job '{name}' scheduled with schedule: {schedule}")

# Schedule various jobs
schedule_job("nightly-backup", "0 2 * * *", {"target": "production-db"})
schedule_job("weekly-digest", "0 8 * * MON", {"report": "weekly"})
schedule_job("hourly-cache-refresh", "@every 1h", {"cache": "products"})
```

## Common Schedule Formats

```python
# Cron expressions (minute hour day month weekday)
"*/5 * * * *"      # Every 5 minutes
"0 9 * * MON-FRI"  # 9am on weekdays
"0 0 1 * *"        # First day of each month at midnight
"0 */6 * * *"      # Every 6 hours

# Special strings
"@every 30s"       # Every 30 seconds
"@every 5m"        # Every 5 minutes
"@every 1h"        # Every hour
"@daily"           # Once a day at midnight
"@weekly"          # Once a week on Sunday
"@monthly"         # Once a month on the 1st
```

## Handling Job Triggers in Your App

```python
from flask import Flask, request
import json

app = Flask(__name__)

@app.route("/job/daily-sales-report", methods=["POST"])
def handle_daily_sales_report():
    """Dapr calls this endpoint when the job triggers."""
    job_data = request.get_json()

    # Access the job data payload
    report_type = job_data.get("reportType", "unknown")

    print(f"Running {report_type} report...")
    generate_report(report_type)

    return "", 200  # Return 200 to acknowledge the job

def generate_report(report_type: str):
    # Your report generation logic here
    pass
```

## Retrieving a Scheduled Job

```bash
curl http://localhost:3500/v1.0-alpha1/jobs/daily-sales-report
```

Response:

```json
{
  "name": "daily-sales-report",
  "schedule": "0 9 * * *",
  "repeats": 0,
  "data": {...}
}
```

## Summary

The Dapr Jobs API provides a simple, durable scheduling mechanism for triggering tasks in your application. Jobs are defined with cron expressions or interval strings, stored durably in the Scheduler service, and delivered to your app via HTTP POST when they trigger. The same API works in self-hosted and Kubernetes environments.
