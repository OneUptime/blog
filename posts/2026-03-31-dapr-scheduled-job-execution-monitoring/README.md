# How to Monitor Dapr Scheduled Job Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scheduler, Job, Monitoring, Observability

Description: Monitor Dapr scheduled job execution using Prometheus metrics, distributed traces, and application-level tracking to ensure jobs run reliably on schedule.

---

## Why Monitor Job Execution?

Scheduled jobs often handle critical tasks like report generation, data cleanup, and notification dispatch. When a job silently fails or is skipped, the impact may not be noticed until data inconsistencies appear. Proactive monitoring helps you catch issues immediately.

## Prometheus Metrics for Job Execution

Dapr exposes metrics for job lifecycle events. Set up a Prometheus scrape for the Scheduler:

```bash
# Total jobs triggered
dapr_scheduler_jobs_triggered_total

# Jobs that failed to trigger
dapr_scheduler_jobs_failed_total

# Job trigger latency histogram
dapr_scheduler_trigger_latency
```

Create a Grafana panel to track execution rate over time:

```bash
# Trigger rate per job type (PromQL)
rate(dapr_scheduler_jobs_triggered_total[5m])
```

## Tracking Execution in Your Application

Add execution tracking in your job handler:

```python
import time
import logging
from dapr.clients import DaprClient

logger = logging.getLogger(__name__)

def handle_job(job_name: str, payload: dict):
    start_time = time.time()
    try:
        logger.info(f"Job {job_name} started", extra={"job": job_name})
        execute_job_logic(payload)
        duration = time.time() - start_time
        logger.info(f"Job {job_name} completed", extra={
            "job": job_name,
            "duration_seconds": duration,
            "status": "success"
        })
        record_job_success(job_name, duration)
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Job {job_name} failed: {e}", extra={
            "job": job_name,
            "duration_seconds": duration,
            "status": "failure"
        })
        record_job_failure(job_name, e)
        raise
```

## Using Dapr State Store for Execution History

Store job execution history in a Dapr state store for auditing:

```python
from dapr.clients import DaprClient
import json
from datetime import datetime, timezone

def record_job_success(job_name: str, duration: float):
    with DaprClient() as client:
        key = f"job-history-{job_name}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        client.save_state(
            store_name="statestore",
            key=key,
            value=json.dumps({
                "job": job_name,
                "status": "success",
                "duration": duration,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        )
```

## Alerting on Missed Job Executions

Create a Prometheus alert for jobs that stop triggering:

```yaml
groups:
  - name: job-execution
    rules:
      - alert: DaprJobNotTriggered
        expr: >
          increase(dapr_scheduler_jobs_triggered_total{type="job"}[25h]) == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "No Dapr scheduled jobs have triggered in 25+ hours"
```

## Distributed Tracing for Job Execution

Link job execution traces to the scheduler trigger using Dapr tracing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: http://otel-collector:4317
      isSecure: false
      protocol: grpc
```

Search for traces with `operation=JobHandler` to find slow or failing executions.

## Summary

Monitor Dapr scheduled job execution using Prometheus metrics for trigger counts and failure rates, application-level logging with structured fields, state store-based execution history, and distributed traces. Set up alerts for jobs that fail to trigger within expected windows to catch missed executions before they cause business impact.
