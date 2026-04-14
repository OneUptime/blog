# How to Use the dapr scheduler Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Scheduler, Job, Cron

Description: Learn how to use the dapr scheduler command to manage and inspect the Dapr Scheduler service for job scheduling and actor reminders.

---

## Overview

The `dapr scheduler` command provides subcommands for interacting with the Dapr Scheduler service. The Scheduler is a control plane component introduced in Dapr 1.14 that manages job scheduling, workflow timers, and actor reminders in a persistent, highly available manner.

## Checking Scheduler Status

Verify the Scheduler service is running in Kubernetes:

```bash
dapr status --kubernetes | grep scheduler
```

Sample output:

```text
  dapr-scheduler-server  dapr-system  True  Running  1  1.14.0  2h
```

## Running the Scheduler Locally

In self-hosted mode, the scheduler starts automatically when you initialize Dapr:

```bash
dapr init
```

The scheduler service runs alongside the other Dapr control plane services. You can verify it is running by checking the process list or Dapr dashboard.

## Scheduling a Job via the Jobs API

Once the Scheduler is running, create a scheduled job using the Dapr Jobs API from your application:

```python
from dapr.clients import DaprClient, Job

with DaprClient() as client:
    job = Job(
        name="daily-report",
        schedule="0 9 * * *",
    )
    client.schedule_job_alpha1(job=job)
    print("Daily report job scheduled")
```

## Managing Jobs with the HTTP API

Create a scheduled job via the sidecar HTTP API:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/daily-report \
  -H "Content-Type: application/json" \
  -d '{"schedule": "0 9 * * *"}'
```

Get a specific job:

```bash
curl http://localhost:3500/v1.0-alpha1/jobs/daily-report
```

Delete a job:

```bash
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/daily-report
```

## Handling Job Triggers in Your App

Your application receives job callbacks via a POST endpoint:

```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/job/daily-report', methods=['POST'])
def handle_report_job():
    data = request.get_json()
    print(f"Running job: {data}")
    generate_report(data.get("reportType"))
    return {"status": "completed"}, 200
```

## Scheduler Configuration in Kubernetes

Configure the scheduler with custom replica counts for high availability:

```bash
dapr init --kubernetes \
          --set global.ha.enabled=true \
          --set global.ha.replicaCount=3 \
          --wait
```

## Verifying Job Persistence

The Scheduler persists jobs using embedded etcd. Verify persistence by creating a job, restarting the scheduler pod, and confirming the job still exists:

```bash
# Restart scheduler
kubectl rollout restart statefulset/dapr-scheduler-server -n dapr-system

# Wait for it to come back
kubectl rollout status statefulset/dapr-scheduler-server -n dapr-system

# Confirm job is still there
curl http://localhost:3500/v1.0-alpha1/jobs/daily-report
```

## Summary

The Dapr Scheduler service provides persistent, distributed job scheduling that survives pod restarts and cluster failures. The `dapr scheduler` CLI command and Jobs API together enable you to create cron-based and interval-based jobs with at-least-once delivery guarantees, making it a reliable alternative to application-level cron implementations.
