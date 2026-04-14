# How to Create Recurring Jobs with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Recurring, Cron, Scheduling, Automation, Background Task

Description: Learn how to create recurring jobs with Dapr using cron expressions and interval schedules, including practical examples for common recurring task patterns.

---

## Recurring Jobs with Dapr Jobs API

Recurring jobs run on a defined schedule - either a cron expression for calendar-based schedules or an interval string for fixed-frequency execution. Unlike one-time jobs, recurring jobs continue firing until explicitly deleted or the application is shut down.

## Cron Expression Syntax

Dapr Jobs uses 6-field cron syntax (with a seconds field):

```text
Second  Minute  Hour  DayOfMonth  Month  DayOfWeek
  0       0       9       *         *      MON-FRI
```

```python
SCHEDULES = {
    "every_minute":          "0 * * * * *",
    "every_5_minutes":       "0 */5 * * * *",
    "every_hour":            "0 0 * * * *",
    "daily_at_midnight":     "0 0 0 * * *",
    "daily_9am_weekdays":    "0 0 9 * * MON-FRI",
    "weekly_monday_8am":     "0 0 8 * * MON",
    "monthly_first_2am":     "0 0 2 1 * *",
    "quarterly_first_of_qtr":"0 0 0 1 1,4,7,10 *"
}
```

## Creating Recurring Jobs via Python SDK

```python
from dapr.clients import DaprClient, Job
from google.protobuf.any_pb2 import Any as GrpcAny
import json

def create_recurring_job(name: str, schedule: str, data: dict):
    with DaprClient() as d:
        job_data = GrpcAny(value=json.dumps(data).encode())

        d.schedule_job_alpha1(
            Job(
                name=name,
                schedule=schedule,
                data=job_data
            )
        )
        print(f"Recurring job created: '{name}' | schedule: {schedule}")

# Common recurring jobs
create_recurring_job(
    name="nightly-db-backup",
    schedule="0 0 2 * * *",
    data={"database": "production", "retention_days": 30}
)

create_recurring_job(
    name="hourly-metrics-flush",
    schedule="@every 1h",
    data={"metrics": ["api_calls", "error_rate", "latency_p99"]}
)

create_recurring_job(
    name="weekly-user-digest",
    schedule="0 0 8 * * MON",
    data={"email_template": "weekly-digest", "segment": "all"}
)

create_recurring_job(
    name="monthly-invoice-generation",
    schedule="0 0 0 1 * *",
    data={"billing_cycle": "monthly"}
)
```

## Creating Recurring Jobs via Go SDK

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    dapr "github.com/dapr/go-sdk/client"
    "google.golang.org/protobuf/types/known/anypb"
)

func createRecurringJob(name, schedule string, data map[string]any) error {
    client, err := dapr.NewClient()
    if err != nil {
        return err
    }
    defer client.Close()

    jobData, _ := json.Marshal(data)

    return client.ScheduleJobAlpha1(context.Background(), &dapr.Job{
        Name:     name,
        Schedule: schedule,
        Data:     &anypb.Any{Value: jobData},
    })
}

func main() {
    jobs := []struct {
        name     string
        schedule string
        data     map[string]any
    }{
        {"cache-warmup", "@every 30m", map[string]any{"caches": []string{"users", "products"}}},
        {"health-report", "0 0 9 * * MON-FRI", map[string]any{"channels": []string{"slack"}}},
        {"db-vacuum", "0 0 3 * * SUN", map[string]any{"tables": []string{"events", "logs"}}},
    }

    for _, j := range jobs {
        if err := createRecurringJob(j.name, j.schedule, j.data); err != nil {
            log.Printf("Failed to create job %s: %v", j.name, err)
        } else {
            log.Printf("Created recurring job: %s", j.name)
        }
    }
}
```

## Handling Recurring Job Triggers

```python
from flask import Flask, request
import json, base64, logging
from datetime import datetime

app = Flask(__name__)
logger = logging.getLogger(__name__)

@app.route("/job/nightly-db-backup", methods=["POST"])
def handle_nightly_backup():
    body = request.get_json() or {}
    job_data = decode_payload(body)

    logger.info(f"Nightly backup triggered at {datetime.utcnow().isoformat()}")
    logger.info(f"Database: {job_data.get('database')}")

    try:
        run_database_backup(
            database=job_data["database"],
            retention_days=job_data.get("retention_days", 7)
        )
        logger.info("Backup completed successfully")
        return "", 200

    except Exception as e:
        logger.error(f"Backup failed: {e}", exc_info=True)
        return {"error": str(e)}, 500

@app.route("/job/hourly-metrics-flush", methods=["POST"])
def handle_metrics_flush():
    body = request.get_json() or {}
    job_data = decode_payload(body)

    metrics = job_data.get("metrics", [])
    for metric in metrics:
        flush_metric_to_datastore(metric)

    return "", 200

def decode_payload(body: dict) -> dict:
    try:
        value = body.get("data", {}).get("value", "e30=")
        return json.loads(base64.b64decode(value))
    except Exception:
        return {}
```

## Registering Jobs at Application Startup

```python
from dapr.clients import DaprClient, Job
from google.protobuf.any_pb2 import Any as GrpcAny
import json, logging

logger = logging.getLogger(__name__)

def register_recurring_jobs():
    """Register all recurring jobs when the application starts."""
    jobs = [
        ("nightly-db-backup", "0 0 2 * * *", {"database": "production"}),
        ("hourly-metrics-flush", "@every 1h", {"metrics": ["errors", "latency"]}),
        ("weekly-digest", "0 0 8 * * MON", {"template": "weekly"}),
    ]

    with DaprClient() as d:
        for name, schedule, data in jobs:
            try:
                job_data = GrpcAny(value=json.dumps(data).encode())
                d.schedule_job_alpha1(
                    Job(
                        name=name,
                        schedule=schedule,
                        data=job_data
                    )
                )
                logger.info(f"Registered recurring job: {name}")
            except Exception as e:
                # Job may already exist from a previous startup - that's OK
                logger.debug(f"Job {name} already registered: {e}")

# Call at startup
register_recurring_jobs()
```

## Listing All Recurring Jobs

```bash
# Dapr does not have a native list-all-jobs endpoint yet
# Track your jobs in a config file or use the get endpoint per job

curl http://localhost:3500/v1.0-alpha1/jobs/nightly-db-backup
curl http://localhost:3500/v1.0-alpha1/jobs/hourly-metrics-flush
```

## Summary

Creating recurring jobs with Dapr is straightforward: define a cron expression or interval string, call the schedule API with a payload, and implement an HTTP handler at `/job/{job-name}`. Jobs persist in the Dapr Scheduler service across application restarts, and the same schedule format works in both self-hosted and Kubernetes deployments.
