# How to Monitor CronJob Last Successful Run and Alert on Missed Schedules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CronJobs, Monitoring, Observability

Description: Learn how to monitor Kubernetes CronJobs for missed schedules and failed runs using metrics, events, and custom alerting to ensure critical batch jobs execute reliably.

---

A CronJob that silently fails to run can cause serious problems. Missed backups mean lost data. Skipped data syncs leave systems out of date. Failed report generation breaks business processes. Monitoring CronJobs proactively catches these issues before they impact your operations.

Kubernetes provides several mechanisms to track CronJob health: status fields showing last schedule time, events recording execution history, and metrics exposed through the metrics server. Combining these with proper alerting ensures you know immediately when scheduled jobs don't run as expected.

## Understanding CronJob Status Fields

Every CronJob maintains status information about its execution history:

```bash
# View CronJob status
kubectl get cronjob backup-job -o yaml

# Key status fields:
# - lastScheduleTime: When the last job was created
# - lastSuccessfulTime: When a job last completed successfully
# - active: Currently running jobs
```

Check these programmatically:

```python
#!/usr/bin/env python3
from kubernetes import client, config
from datetime import datetime, timedelta

def check_cronjob_health(cronjob_name, namespace='default', max_age_minutes=60):
    """Check if CronJob has run recently"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    cj = batch_v1.read_namespaced_cron_job(cronjob_name, namespace)

    # Parse schedule to determine expected interval
    # This is simplified - real implementation would parse cron syntax
    schedule = cj.spec.schedule

    last_schedule = cj.status.last_schedule_time
    last_successful = cj.status.last_successful_time

    now = datetime.now(last_schedule.tzinfo) if last_schedule else datetime.utcnow()

    # Check if we've scheduled recently
    if last_schedule:
        age = now - last_schedule
        if age > timedelta(minutes=max_age_minutes):
            print(f"WARNING: {cronjob_name} hasn't scheduled in {age}")
            return False

    # Check if last run succeeded
    if last_successful:
        success_age = now - last_successful
        if success_age > timedelta(minutes=max_age_minutes * 2):
            print(f"WARNING: {cronjob_name} hasn't succeeded in {success_age}")
            return False
    elif last_schedule:
        print(f"WARNING: {cronjob_name} has never succeeded")
        return False

    print(f"OK: {cronjob_name} is healthy")
    return True

if __name__ == "__main__":
    import sys
    name = sys.argv[1] if len(sys.argv) > 1 else "backup-job"
    healthy = check_cronjob_health(name, max_age_minutes=70)
    sys.exit(0 if healthy else 1)
```

Run this as a monitoring check from your observability system.

## Monitoring with Prometheus

Export CronJob metrics to Prometheus using kube-state-metrics:

```yaml
# kube-state-metrics exposes these metrics:
# kube_cronjob_next_schedule_time
# kube_cronjob_status_last_schedule_time
# kube_cronjob_status_last_successful_time
# kube_cronjob_status_active

# Alert rule for missed schedules
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cronjob-alerts
spec:
  groups:
  - name: cronjob
    interval: 30s
    rules:
    # Alert if CronJob hasn't run in 2x its normal interval
    - alert: CronJobNotScheduled
      expr: |
        (time() - kube_cronjob_status_last_schedule_time) > 7200
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "CronJob {{ $labels.cronjob }} hasn't scheduled"
        description: "CronJob {{ $labels.cronjob }} in {{ $labels.namespace }} hasn't scheduled a job in over 2 hours"

    # Alert if last job failed
    - alert: CronJobFailed
      expr: |
        kube_job_status_failed{job_name=~".*"} > 0
        and
        kube_job_owner{owner_kind="CronJob"} == 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "CronJob {{ $labels.job_name }} failed"
        description: "Job {{ $labels.job_name }} from CronJob failed"

    # Alert if no successful run in expected window
    - alert: CronJobNeverSucceeded
      expr: |
        (time() - kube_cronjob_status_last_successful_time) > 86400
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "CronJob {{ $labels.cronjob }} hasn't succeeded in 24h"
        description: "CronJob {{ $labels.cronjob }} in {{ $labels.namespace }} hasn't completed successfully in over 24 hours"
```

## Creating Custom Monitoring Jobs

Deploy a dedicated monitoring CronJob that checks other CronJobs:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cronjob-monitor
spec:
  schedule: "*/10 * * * *"  # Check every 10 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cronjob-monitor
          restartPolicy: OnFailure
          containers:
          - name: monitor
            image: cronjob-monitor:latest
            command:
            - python3
            - /app/monitor.py
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cronjob-monitor
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cronjob-monitor-role
rules:
- apiGroups: ["batch"]
  resources: ["cronjobs", "jobs"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cronjob-monitor-binding
subjects:
- kind: ServiceAccount
  name: cronjob-monitor
  namespace: default
roleRef:
  kind: ClusterRole
  name: cronjob-monitor-role
  apiGroup: rbac.authorization.k8s.io
```

The monitoring script:

```python
#!/usr/bin/env python3
from kubernetes import client, config
from datetime import datetime, timedelta
import requests
import os

def parse_cron_schedule(schedule):
    """Estimate interval from cron schedule (simplified)"""
    # This is a basic parser - production code should use croniter
    parts = schedule.split()

    # Hourly if minute is specified but hour is *
    if parts[1] == '*':
        return timedelta(hours=1)

    # Daily if hour is specified but day is *
    if parts[2] == '*':
        return timedelta(days=1)

    # Default to daily
    return timedelta(days=1)

def send_alert(cronjob_name, namespace, message):
    """Send alert to external system"""
    webhook_url = os.getenv('ALERT_WEBHOOK_URL')
    if not webhook_url:
        print(f"ALERT: {namespace}/{cronjob_name}: {message}")
        return

    payload = {
        'cronjob': cronjob_name,
        'namespace': namespace,
        'message': message,
        'timestamp': datetime.utcnow().isoformat()
    }

    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to send alert: {e}")

def check_all_cronjobs():
    """Check all CronJobs for health issues"""
    config.load_incluster_config()
    batch_v1 = client.BatchV1Api()

    cronjobs = batch_v1.list_cron_job_for_all_namespaces()
    now = datetime.now(datetime.timezone.utc)

    issues_found = 0

    for cj in cronjobs.items:
        name = cj.metadata.name
        namespace = cj.metadata.namespace
        schedule = cj.spec.schedule

        # Skip if monitoring is disabled
        if cj.metadata.annotations and \
           cj.metadata.annotations.get('monitor') == 'false':
            continue

        # Estimate expected interval
        interval = parse_cron_schedule(schedule)
        expected_window = interval * 2  # Allow 2x interval before alerting

        # Check last schedule time
        last_schedule = cj.status.last_schedule_time
        if last_schedule:
            age = now - last_schedule.replace(tzinfo=datetime.timezone.utc)
            if age > expected_window:
                send_alert(name, namespace,
                          f"No schedule in {age.total_seconds()/3600:.1f}h (expected every {interval.total_seconds()/3600:.1f}h)")
                issues_found += 1

        # Check last successful time
        last_successful = cj.status.last_successful_time
        if last_successful:
            success_age = now - last_successful.replace(tzinfo=datetime.timezone.utc)
            if success_age > expected_window * 3:  # More lenient for success
                send_alert(name, namespace,
                          f"No success in {success_age.total_seconds()/3600:.1f}h")
                issues_found += 1
        elif last_schedule:
            # Has scheduled but never succeeded
            send_alert(name, namespace, "Has never completed successfully")
            issues_found += 1

    print(f"Monitoring check complete: {issues_found} issues found")
    return issues_found

if __name__ == "__main__":
    issues = check_all_cronjobs()
    import sys
    sys.exit(1 if issues > 0 else 0)
```

## Checking for Suspended CronJobs

Alert on CronJobs that have been suspended:

```bash
#!/bin/bash
# check-suspended-cronjobs.sh

SUSPENDED=$(kubectl get cronjobs -A -o json | \
  jq -r '.items[] | select(.spec.suspend == true) |
    "\(.metadata.namespace)/\(.metadata.name)"')

if [ -n "$SUSPENDED" ]; then
  echo "WARNING: Suspended CronJobs found:"
  echo "$SUSPENDED"

  # Send alert
  curl -X POST $ALERT_WEBHOOK \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Suspended CronJobs: $SUSPENDED\"}"

  exit 1
fi

echo "OK: No suspended CronJobs"
exit 0
```

## Monitoring Job Failures

Track failed jobs from CronJobs:

```python
#!/usr/bin/env python3
from kubernetes import client, config
from datetime import datetime, timedelta

def check_recent_failures(hours=24):
    """Find failed jobs from CronJobs in last N hours"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    cutoff = datetime.now(datetime.timezone.utc) - timedelta(hours=hours)
    jobs = batch_v1.list_job_for_all_namespaces()

    failures = []

    for job in jobs.items:
        # Skip if not from a CronJob
        if not job.metadata.owner_references:
            continue

        owner = job.metadata.owner_references[0]
        if owner.kind != 'CronJob':
            continue

        # Check if failed
        if job.status.failed and job.status.failed > 0:
            # Check if recent
            completion_time = job.status.completion_time
            if completion_time and completion_time.replace(tzinfo=datetime.timezone.utc) > cutoff:
                failures.append({
                    'cronjob': owner.name,
                    'job': job.metadata.name,
                    'namespace': job.metadata.namespace,
                    'failed_at': completion_time,
                    'failed_count': job.status.failed
                })

    if failures:
        print(f"Found {len(failures)} failed jobs in last {hours}h:")
        for f in failures:
            print(f"  {f['namespace']}/{f['cronjob']}: {f['job']} "
                  f"(failed {f['failed_count']} times at {f['failed_at']})")

    return failures

if __name__ == "__main__":
    failures = check_recent_failures(24)
    import sys
    sys.exit(1 if failures else 0)
```

## Using Kubernetes Events

Monitor events for schedule misses:

```bash
# Check events for a specific CronJob
kubectl get events --field-selector involvedObject.name=backup-job

# Look for "missed start time" events
kubectl get events -A --sort-by='.lastTimestamp' | grep -i "missed"

# Get events programmatically
kubectl get events -o json | \
  jq -r '.items[] |
    select(.involvedObject.kind=="CronJob") |
    select(.reason=="FailedScheduling" or .reason=="MissSchedule") |
    "\(.involvedObject.name): \(.message)"'
```

## Dashboard Queries

Create Grafana dashboard panels:

```promql
# Time since last successful run (in hours)
(time() - kube_cronjob_status_last_successful_time{cronjob="backup-job"}) / 3600

# Number of active jobs from CronJob
kube_cronjob_status_active{cronjob="backup-job"}

# Jobs created by CronJob (rate over 1h)
rate(kube_cronjob_status_last_schedule_time{cronjob="backup-job"}[1h])

# Failed jobs from CronJobs
sum by (cronjob) (
  kube_job_status_failed{job_name=~"backup-job-.*"} > 0
)
```

## Setting Up Slack Alerts

Send CronJob failures to Slack:

```python
#!/usr/bin/env python3
import requests
import os
from kubernetes import client, config

def send_slack_alert(cronjob_name, namespace, message):
    """Send alert to Slack"""
    webhook_url = os.getenv('SLACK_WEBHOOK_URL')
    if not webhook_url:
        return

    payload = {
        'text': f':warning: CronJob Alert',
        'attachments': [{
            'color': 'danger',
            'fields': [
                {
                    'title': 'CronJob',
                    'value': f'{namespace}/{cronjob_name}',
                    'short': True
                },
                {
                    'title': 'Issue',
                    'value': message,
                    'short': False
                }
            ]
        }]
    }

    requests.post(webhook_url, json=payload)

# Use in monitoring script
if age > expected_window:
    send_slack_alert(name, namespace, f"Missed schedule (last run {age} ago)")
```

## Complete Monitoring Stack

Combine all techniques:

```yaml
# Prometheus alerts for automated detection
# Custom monitoring CronJob for detailed checks
# Slack/PagerDuty integration for notifications
# Grafana dashboards for visualization
# Event tracking for audit trail

# Example: Complete monitoring setup
apiVersion: v1
kind: ConfigMap
metadata:
  name: cronjob-monitor-config
data:
  config.yaml: |
    cronjobs:
      - name: database-backup
        namespace: default
        max_age_hours: 25  # Daily job with 1h tolerance
        critical: true
      - name: hourly-sync
        namespace: data
        max_age_hours: 2  # Hourly job with tolerance
        critical: false
```

Monitoring CronJobs prevents silent failures that can lead to data loss, compliance issues, and operational problems. Implement comprehensive monitoring with automated alerts to ensure critical scheduled jobs always run as expected.
