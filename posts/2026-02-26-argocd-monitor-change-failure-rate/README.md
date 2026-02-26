# How to Monitor ArgoCD Change Failure Rate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, DORA Metrics, Monitoring

Description: Learn how to measure and monitor change failure rate in ArgoCD to track the percentage of deployments that cause failures and improve deployment reliability.

---

Change failure rate (CFR) measures the percentage of deployments that cause a failure in production. It is the third DORA metric and directly reflects the quality of your delivery process. A high change failure rate means your team is shipping broken changes too often. A low rate means your testing, review, and validation processes are working well.

In ArgoCD, tracking change failure rate requires understanding what constitutes a "failure" in the GitOps context and how to calculate the ratio reliably.

## Defining Failure in ArgoCD

Not every failed sync is a deployment failure in the DORA sense. You need to distinguish between:

**Counts as a change failure:**
- A sync succeeds but the application becomes Degraded or Missing
- A sync succeeds but causes rollback
- A deployment triggers alerts or incidents
- Health checks fail after successful sync

**Does not count as a change failure:**
- Transient sync failures due to API server throttling
- Network timeouts during manifest fetch
- Permission errors that prevent sync from starting
- Self-heal corrections

The key distinction: a change failure is when new code reaches production and causes problems, not when the deployment mechanism itself has issues.

## ArgoCD Metrics for Change Failure Rate

ArgoCD provides these relevant metrics:

```promql
# Total sync attempts by phase
argocd_app_sync_total{phase="Succeeded"}
argocd_app_sync_total{phase="Failed"}
argocd_app_sync_total{phase="Error"}

# Application health status
argocd_app_info{health_status="Degraded"}
argocd_app_info{health_status="Healthy"}
argocd_app_info{health_status="Missing"}
```

## Calculating Basic Change Failure Rate

The simplest formula uses sync success and failure counts:

```promql
# Basic CFR: percentage of failed syncs
sum(increase(argocd_app_sync_total{phase=~"Failed|Error"}[7d]))
/
sum(increase(argocd_app_sync_total[7d]))
* 100
```

This gives you a rough CFR, but it includes transient failures. A better approach tracks post-deployment health.

## Tracking Post-Deployment Health Failures

A more accurate CFR comes from watching application health after successful syncs. If an application becomes Degraded within a time window after a successful sync, that counts as a change failure.

Here is a ConfigMap-based approach using ArgoCD Notifications:

```yaml
# argocd-notifications-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Track successful deployments
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      oncePer: app.status.sync.revision
      send: [record-deployment]

  # Track post-deployment failures
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [record-failure]

  template.record-deployment: |
    webhook:
      cfr-tracker:
        method: POST
        body: |
          {
            "type": "deployment",
            "app": "{{.app.metadata.name}}",
            "revision": "{{.app.status.sync.revision}}",
            "timestamp": "{{.app.status.operationState.finishedAt}}"
          }

  template.record-failure: |
    webhook:
      cfr-tracker:
        method: POST
        body: |
          {
            "type": "failure",
            "app": "{{.app.metadata.name}}",
            "revision": "{{.app.status.sync.revision}}",
            "timestamp": "{{now}}"
          }

  service.webhook.cfr-tracker: |
    url: http://cfr-tracker.observability:8080/events
    headers:
      - name: Content-Type
        value: application/json
```

## Building a CFR Tracking Service

Create a service that receives events and calculates CFR:

```python
# cfr_tracker.py
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from collections import defaultdict
from datetime import datetime, timedelta, timezone

# Track deployments and failures per app
deployments = defaultdict(list)  # app -> [timestamps]
failures = defaultdict(list)     # app -> [timestamps]

class CFRHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Receive deployment and failure events."""
        content_length = int(
            self.headers.get("Content-Length", 0)
        )
        body = json.loads(
            self.rfile.read(content_length).decode()
        )

        app = body["app"]
        timestamp = body["timestamp"]
        event_type = body["type"]

        if event_type == "deployment":
            deployments[app].append(timestamp)
        elif event_type == "failure":
            # Only count if there was a recent deployment
            recent = any(
                is_recent(ts, minutes=30)
                for ts in deployments[app]
            )
            if recent:
                failures[app].append(timestamp)

        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        """Serve Prometheus metrics."""
        if self.path == "/metrics":
            body = build_metrics().encode()
            self.send_response(200)
            self.send_header(
                "Content-Type", "text/plain"
            )
            self.end_headers()
            self.wfile.write(body)

def is_recent(timestamp_str, minutes=30):
    """Check if a timestamp is within the last N minutes."""
    ts = datetime.fromisoformat(
        timestamp_str.replace("Z", "+00:00")
    )
    return (
        datetime.now(timezone.utc) - ts
    ) < timedelta(minutes=minutes)

def build_metrics():
    """Generate Prometheus metrics for CFR."""
    lines = [
        "# HELP argocd_change_failure_rate "
        "Ratio of failed deployments to total deployments",
        "# TYPE argocd_change_failure_rate gauge",
        "# HELP argocd_deployment_total "
        "Total number of deployments",
        "# TYPE argocd_deployment_total counter",
        "# HELP argocd_deployment_failures "
        "Number of deployment failures",
        "# TYPE argocd_deployment_failures counter",
    ]

    for app in set(
        list(deployments.keys()) + list(failures.keys())
    ):
        total = len(deployments[app])
        failed = len(failures[app])
        cfr = (failed / total * 100) if total > 0 else 0

        lines.append(
            f'argocd_deployment_total{{app="{app}"}} '
            f'{total}'
        )
        lines.append(
            f'argocd_deployment_failures{{app="{app}"}} '
            f'{failed}'
        )
        lines.append(
            f'argocd_change_failure_rate{{app="{app}"}} '
            f'{cfr:.2f}'
        )

    return "\n".join(lines) + "\n"

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8080), CFRHandler)
    print("CFR tracker running on :8080")
    server.serve_forever()
```

## Using Rollback Events as a Failure Signal

Another approach uses rollback operations as a proxy for change failures. If someone rolls back a deployment, the previous change likely failed:

```promql
# Count rollback operations as failures
# ArgoCD records rollbacks in the operation history
sum(increase(
  argocd_app_sync_total{phase="Succeeded"}[7d]
)) by (name)
```

Track rollbacks with a recording rule:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-cfr-recording-rules
  namespace: argocd
spec:
  groups:
    - name: argocd-cfr
      interval: 5m
      rules:
        # Record the number of apps that went degraded
        - record: argocd:app_degraded_transitions:sum
          expr: >
            sum(changes(
              argocd_app_info{health_status="Degraded"}[1h]
            )) by (name)

        # Record total successful syncs
        - record: argocd:app_successful_syncs:sum
          expr: >
            sum(increase(
              argocd_app_sync_total{phase="Succeeded"}[1h]
            )) by (name)

        # Calculate hourly CFR
        - record: argocd:change_failure_rate:ratio
          expr: >
            argocd:app_degraded_transitions:sum
            /
            (argocd:app_successful_syncs:sum > 0)
            * 100
```

## Alerting on High Change Failure Rate

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-cfr-alerts
  namespace: argocd
spec:
  groups:
    - name: change-failure-rate
      rules:
        - alert: HighChangeFailureRate
          expr: >
            (
              sum(increase(
                argocd_app_sync_total{phase=~"Failed|Error"}[7d]
              ))
              /
              sum(increase(
                argocd_app_sync_total[7d]
              ))
            ) > 0.15
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Change failure rate exceeds 15%"
            description: >
              The overall change failure rate across ArgoCD
              applications is {{ $value | humanizePercentage }},
              which exceeds the 15% threshold.

        - alert: AppHighChangeFailureRate
          expr: >
            (
              sum(increase(
                argocd_app_sync_total{phase=~"Failed|Error"}[7d]
              )) by (name)
              /
              sum(increase(
                argocd_app_sync_total[7d]
              )) by (name)
            ) > 0.25
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "High CFR for {{ $labels.name }}"
```

## DORA Benchmarks for Change Failure Rate

| Performance Level | Change Failure Rate |
|---|---|
| Elite | 0-15% |
| High | 16-30% |
| Medium | 16-30% |
| Low | 46-60% |

## Reducing Change Failure Rate

If your CFR is high, consider:

1. **Add pre-sync hooks** for validation before deploying
2. **Implement progressive delivery** with canary deployments
3. **Use ArgoCD sync windows** to limit deployments to safe periods
4. **Require PR reviews** on manifest changes in your Git repository
5. **Add health checks** to catch issues faster

## Summary

Monitoring change failure rate in ArgoCD requires looking beyond simple sync failures. Track post-deployment health transitions, rollback events, and incident correlations to get an accurate picture. Combine ArgoCD Notifications with a custom tracking service for the most reliable CFR measurement. Use the resulting data to drive improvements in your testing and validation processes.

For the complete DORA picture, also track [deployment lead time](https://oneuptime.com/blog/post/2026-02-26-argocd-monitor-deployment-lead-time/view) and [mean time to recovery](https://oneuptime.com/blog/post/2026-02-26-argocd-monitor-mean-time-to-recovery/view).
