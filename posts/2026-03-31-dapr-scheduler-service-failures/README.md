# How to Handle Dapr Scheduler Service Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scheduler, Failure, Recovery, Kubernetes

Description: Handle Dapr Scheduler service failures gracefully by configuring retries, detecting outages early, and implementing recovery procedures to minimize missed jobs.

---

## Impact of Scheduler Failures

When the Dapr Scheduler service goes down, new job schedules cannot be registered and pending jobs will not trigger. Existing in-flight job callbacks may also fail. Understanding the blast radius helps you design appropriate failover strategies.

## Configuring Retry Behavior in the Sidecar

The Dapr sidecar retries connecting to the Scheduler when it is unavailable. You can configure the retry behavior via Dapr annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: job-producer
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "job-producer"
        dapr.io/config: "dapr-config"
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
spec:
  api:
    allowed:
      - name: jobs
        version: v1alpha1
        protocol: http
```

## Detecting Scheduler Failures

Use Prometheus alerts to detect Scheduler failures quickly:

```yaml
groups:
  - name: scheduler-failures
    rules:
      - alert: DaprSchedulerAllPodsDown
        expr: count(up{job="dapr-scheduler"} == 1) == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "All Dapr Scheduler pods are down"

      - alert: DaprSchedulerEtcdLeaderLost
        expr: sum(etcd_server_is_leader) == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Dapr Scheduler etcd has no leader"
```

## Recovery Procedure

When the Scheduler recovers from a failure, verify it is healthy before relying on jobs:

```bash
# Check all replicas are running
kubectl get pods -n dapr-system -l app=dapr-scheduler-server

# Verify etcd leader election
kubectl exec -n dapr-system dapr-scheduler-0 -- \
  etcdctl --endpoints=http://localhost:2379 endpoint status --write-out=table

# Check existing jobs are still registered
curl http://localhost:3500/v1.0-alpha1/jobs/my-critical-job
```

## Handling Missed Job Executions

Dapr Scheduler does not replay missed jobs after recovery. Implement compensating logic in your application:

```python
import requests
from datetime import datetime, timedelta

def check_and_replay_missed_jobs():
    last_run = get_last_successful_run("daily-report")
    now = datetime.utcnow()

    if last_run and (now - last_run) > timedelta(hours=25):
        print(f"Missed execution detected. Last run: {last_run}. Triggering manually.")
        requests.post(
            "http://localhost:3500/v1.0/invoke/my-app/method/job/daily-report",
            json={"reason": "missed-execution-replay", "original_time": str(last_run)}
        )
```

## Preventing Single Points of Failure

The Dapr Scheduler is deployed as a 3-replica StatefulSet by default (hardcoded in the Helm chart to form a 3-node etcd cluster). Ensure you have not scaled it down manually:

```bash
kubectl get statefulset -n dapr-system dapr-scheduler-server
```

If you need to install Dapr with HA enabled for the other control plane services as well, use:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true \
  --reuse-values
```

## Summary

Handle Dapr Scheduler failures by verifying the default 3-replica StatefulSet is healthy, setting up Prometheus alerts for early detection, and implementing application-level missed-execution detection. After recovery, verify etcd leader election and check that jobs are still registered. Design critical workflows to detect gaps in job execution and replay them when needed.
