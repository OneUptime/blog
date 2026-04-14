# How to Monitor Dapr Scheduler Service Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scheduler, Monitoring, Health, Kubernetes

Description: Monitor Dapr Scheduler service health using liveness probes, Prometheus metrics, and log analysis to detect failures before they impact job execution.

---

## Health Check Endpoints

The Dapr Scheduler service exposes health endpoints for liveness and readiness checks. These are used by Kubernetes to determine if a pod should receive traffic or be restarted.

```bash
# Check scheduler health directly
kubectl exec -it dapr-scheduler-server-0 -n dapr-system -- wget -qO- http://localhost:8080/healthz
```

## Kubernetes Probe Configuration

Verify the scheduler's probes are configured correctly in the StatefulSet:

```bash
kubectl get statefulset dapr-scheduler-server -n dapr-system -o yaml | grep -A 15 livenessProbe
```

You can customize probe thresholds via Helm:

```yaml
dapr_scheduler:
  livenessProbe:
    failureThreshold: 5
    initialDelaySeconds: 10
    periodSeconds: 10
  readinessProbe:
    failureThreshold: 3
    initialDelaySeconds: 5
    periodSeconds: 10
```

## Prometheus Metrics for Scheduler

Scrape scheduler metrics using Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-scheduler-monitor
  namespace: dapr-system
spec:
  selector:
    matchLabels:
      app: dapr-scheduler-server
  endpoints:
    - port: metrics
      interval: 30s
```

Key metrics:

```bash
# Jobs scheduled successfully
dapr_scheduler_jobs_created_total

# Jobs triggered
dapr_scheduler_jobs_triggered_total

# Failed job triggers
dapr_scheduler_trigger_jobs_failed_total

# etcd leader status
etcd_server_is_leader
```

## Alerting Rules

Set up Prometheus alert rules for Scheduler health:

```yaml
groups:
  - name: dapr-scheduler
    rules:
      - alert: DaprSchedulerDown
        expr: up{job="dapr-scheduler"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Dapr Scheduler is down"

      - alert: DaprSchedulerHighJobFailureRate
        expr: rate(dapr_scheduler_trigger_jobs_failed_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Dapr Scheduler job failure rate is high"
```

## Log-Based Health Monitoring

Parse scheduler logs for health indicators:

```bash
# Watch for etcd election events
kubectl logs -n dapr-system -l app=dapr-scheduler-server --follow | grep -i "leader\|election\|error"

# Check for connection issues
kubectl logs -n dapr-system dapr-scheduler-server-0 | grep -i "connection refused\|timeout"
```

## Summary

Monitor Dapr Scheduler health using Kubernetes probes, Prometheus metrics, and log analysis. Key metrics include job creation, trigger counts, and failure rates. Set up alerts for scheduler downtime and high failure rates to ensure scheduled jobs execute reliably and issues are caught before they cause significant disruption.
