# How to Implement Batch Job Scheduling with Dapr Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job Scheduling, Batch Processing, Cron, Kubernetes

Description: Learn how to schedule and manage recurring batch jobs using the Dapr Jobs API for reliable cron-based task execution in microservices.

---

The Dapr Jobs API (introduced in Dapr 1.14) provides a durable job scheduling system that survives service restarts and scales with your application. Unlike Kubernetes CronJobs, Dapr Jobs are managed at the application level and integrate directly with your service code.

## Understanding Dapr Jobs vs Cron Bindings

- **Dapr Jobs API**: Durable, programmatically managed, supports one-time and recurring jobs with state persistence.
- **Cron bindings**: Simple periodic triggers, less durable, no built-in job management.

Use Dapr Jobs when you need to schedule jobs dynamically at runtime or require job state persistence.

## Schedule a Recurring Batch Job

```python
from dapr.clients import DaprClient, Job
import json

with DaprClient() as client:
    # Schedule a daily report generation job
    job = Job(
        name="daily-report",
        schedule="@daily",  # or "0 0 2 * * *" for 2 AM daily (6-field cron with seconds)
        data=json.dumps({
            "reportType": "sales",
            "format": "csv",
            "recipients": ["reports@company.com"]
        }).encode()
    )
    client.schedule_job_alpha1(job)
    print("Daily report job scheduled")
```

## Schedule a One-Time Future Job

```python
from dapr.clients import DaprClient, Job
from datetime import datetime, timedelta
import json

with DaprClient() as client:
    # Run once in 1 hour
    run_at = datetime.utcnow() + timedelta(hours=1)

    job = Job(
        name="end-of-promo-cleanup",
        due_time=run_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        data=json.dumps({"promoId": "SUMMER2026"}).encode()
    )
    client.schedule_job_alpha1(job)
```

## Handle Job Execution

Register a job handler endpoint in your service:

```python
from flask import Flask, request
import json

app = Flask(__name__)

@app.route('/job/daily-report', methods=['POST'])
def handle_daily_report():
    job_data = request.json
    payload = json.loads(job_data.get('data', '{}'))

    print(f"Running {payload['reportType']} report")

    try:
        report_path = generate_report(payload['reportType'], payload['format'])
        send_report_email(report_path, payload['recipients'])
        return {'status': 'completed', 'reportPath': report_path}, 200
    except Exception as e:
        print(f"Job failed: {e}")
        return {'status': 'failed', 'error': str(e)}, 500
```

## List and Manage Scheduled Jobs

```python
with DaprClient() as client:
    # Get a specific job
    job = client.get_job_alpha1("daily-report")
    print(f"Next run: {job.schedule}")

    # Delete a job
    client.delete_job_alpha1("end-of-promo-cleanup")
    print("One-time job removed")
```

## Deploy the Job Handler Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-scheduler
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "batch-scheduler"
        dapr.io/app-port: "5000"
    spec:
      containers:
      - name: batch-scheduler
        image: batch-scheduler:latest
        env:
        - name: DAPR_HTTP_PORT
          value: "3500"
```

## Error Handling and Retry Configuration

The Dapr Jobs API has a built-in failure policy that you configure directly on the job. Use `ConstantFailurePolicy` to retry failed jobs with a fixed interval:

```python
from dapr.clients import DaprClient, Job
from dapr.clients.grpc._helpers import ConstantFailurePolicy
import json

with DaprClient() as client:
    job = Job(
        name="daily-report",
        schedule="@daily",
        data=json.dumps({"reportType": "sales"}).encode(),
        failure_policy=ConstantFailurePolicy(
            max_retries=3,
            interval_seconds=60
        )
    )
    client.schedule_job_alpha1(job)
```

Alternatively, use `DropFailurePolicy` to fail immediately without retries if a job execution fails.

## Monitor Job Execution

Track job completion with Dapr state:

```python
@app.route('/job/daily-report', methods=['POST'])
def handle_daily_report():
    with DaprClient() as client:
        job_run = {
            "jobName": "daily-report",
            "startedAt": datetime.utcnow().isoformat(),
            "status": "running"
        }
        client.save_state('statestore', 'job:daily-report:latest', json.dumps(job_run))

        # ... execute job ...

        job_run["status"] = "completed"
        job_run["completedAt"] = datetime.utcnow().isoformat()
        client.save_state('statestore', 'job:daily-report:latest', json.dumps(job_run))

    return '', 200
```

## Summary

The Dapr Jobs API provides durable scheduled job management directly within your microservice architecture. Unlike Kubernetes CronJobs, Dapr Jobs are programmatically scheduled at runtime, survive service restarts, and integrate with Dapr's resiliency policies for automatic retry on failure. Track job execution state in Dapr state stores for operational visibility into your batch scheduling system.
