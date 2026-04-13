# How to Use Dapr Workflow for Monitor Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Monitor Pattern, Polling, Long-Running

Description: Implement the monitor workflow pattern in Dapr to periodically check external conditions and take action when thresholds are met, replacing fragile cron jobs.

---

The monitor pattern is a recurring workflow that periodically polls an external resource and takes action when a condition is met. Unlike a cron job, Dapr workflows remember their state, can adapt their polling interval dynamically, and continue across restarts.

## When to Use the Monitor Pattern

- Poll an external job until it completes
- Watch a resource until it enters a desired state
- Check health of a dependency and alert when degraded
- Monitor a queue depth and scale resources accordingly

## Basic Monitor Implementation

```python
from dapr.ext.workflow import DaprWorkflowContext, WorkflowActivityContext
from datetime import timedelta

def check_job_status(ctx: WorkflowActivityContext, job_id: str) -> dict:
    # Replace with actual status check
    import requests
    resp = requests.get(f"https://jobs.example.com/status/{job_id}")
    return resp.json()  # {"status": "running"|"completed"|"failed", "progress": 0-100}

def send_alert(ctx: WorkflowActivityContext, payload: dict) -> dict:
    print(f"Alert: {payload['message']}")
    # Send to Slack, PagerDuty, etc.
    return {"alerted": True}

def job_monitor_workflow(ctx: DaprWorkflowContext, params: dict):
    job_id = params["job_id"]
    max_iterations = params.get("max_iterations", 60)
    poll_interval_seconds = params.get("poll_interval", 30)

    for i in range(max_iterations):
        status = yield ctx.call_activity(check_job_status, input=job_id)

        if status["status"] == "completed":
            return {"outcome": "completed", "iterations": i + 1}

        if status["status"] == "failed":
            yield ctx.call_activity(send_alert, input={
                "message": f"Job {job_id} failed after {i + 1} checks"
            })
            return {"outcome": "failed", "iterations": i + 1}

        # Wait before next poll
        yield ctx.create_timer(
            ctx.current_utc_datetime + timedelta(seconds=poll_interval_seconds)
        )

    # Max iterations reached
    yield ctx.call_activity(send_alert, input={
        "message": f"Job {job_id} did not complete within expected time"
    })
    return {"outcome": "timeout", "iterations": max_iterations}
```

## Adaptive Polling Interval

Adjust the polling interval based on job progress:

```python
def adaptive_monitor_workflow(ctx: DaprWorkflowContext, params: dict):
    job_id = params["job_id"]

    while True:
        status = yield ctx.call_activity(check_job_status, input=job_id)

        if status["status"] in ("completed", "failed"):
            break

        # Poll faster as job nears completion
        progress = status.get("progress", 0)
        if progress > 80:
            interval = 5    # Check every 5 seconds
        elif progress > 50:
            interval = 15   # Check every 15 seconds
        else:
            interval = 60   # Check every minute

        yield ctx.create_timer(
            ctx.current_utc_datetime + timedelta(seconds=interval)
        )

    return status
```

## Health Monitor Pattern

Continuously monitor service health and alert on degradation:

```python
def health_monitor_workflow(ctx: DaprWorkflowContext, config: dict):
    endpoint = config["endpoint"]
    consecutive_failures = 0
    max_failures = config.get("max_failures", 3)
    check_interval = config.get("interval_seconds", 60)

    while True:
        health = yield ctx.call_activity(check_health, input=endpoint)

        if health["healthy"]:
            if consecutive_failures > 0:
                yield ctx.call_activity(send_alert, input={
                    "message": f"{endpoint} recovered after {consecutive_failures} failures"
                })
            consecutive_failures = 0
        else:
            consecutive_failures += 1
            if consecutive_failures >= max_failures:
                yield ctx.call_activity(send_alert, input={
                    "message": f"{endpoint} has been unhealthy for {consecutive_failures} checks"
                })

        yield ctx.create_timer(
            ctx.current_utc_datetime + timedelta(seconds=check_interval)
        )
```

## Starting a Long-Running Monitor

```python
client = DaprWorkflowClient()

# Start a monitor that runs for up to 30 minutes
instance_id = client.schedule_new_workflow(
    workflow=job_monitor_workflow,
    input={
        "job_id": "batch-export-20260331",
        "max_iterations": 60,
        "poll_interval": 30
    },
    instance_id="monitor-batch-export-20260331"
)
print(f"Monitor started: {instance_id}")
```

## Terminating a Monitor

Stop the monitor when it is no longer needed:

```bash
dapr workflow terminate monitor-batch-export-20260331 --app-id myapp
```

## Summary

The Dapr workflow monitor pattern replaces fragile cron-based polling with durable, stateful monitoring loops. Using `ctx.create_timer()` for delays instead of `time.sleep()` ensures the workflow survives restarts and correctly resumes from the last completed check. Adaptive intervals and consecutive-failure tracking make monitors efficient without sacrificing responsiveness.
