# How to Monitor ArgoCD Deployment Frequency

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, DORA Metrics, Monitoring

Description: Learn how to track and monitor deployment frequency in ArgoCD using Prometheus metrics, custom queries, and dashboards to measure your team's delivery velocity.

---

Deployment frequency measures how often your team ships changes to production. It is one of the four DORA metrics and a strong predictor of engineering team performance. High-performing teams deploy on demand, sometimes multiple times per day. Low performers might deploy once a month or less.

ArgoCD makes tracking deployment frequency straightforward because every sync operation is recorded in application history and exposed through Prometheus metrics.

## What Counts as a Deployment

Before measuring, you need to define what counts as a deployment. In ArgoCD, there are several sync triggers:

- **Manual sync** - someone clicked "Sync" in the UI or ran `argocd app sync`
- **Auto-sync** - ArgoCD detected a change and synced automatically
- **Self-heal** - ArgoCD corrected drift from the desired state
- **Retry** - a failed sync was retried

For DORA metrics, you typically want to count intentional deployments (manual + auto-sync from new commits) and exclude self-heal operations that do not represent new code reaching production.

## ArgoCD Metrics for Deployment Frequency

The primary metric is `argocd_app_sync_total`, which is a counter that increments on every sync operation:

```promql
# Total syncs per application
argocd_app_sync_total

# Labels available:
# - name: application name
# - namespace: application namespace
# - project: ArgoCD project
# - phase: Succeeded, Failed, Error
```

## Basic Deployment Frequency Queries

Here are the PromQL queries you need for tracking deployment frequency:

```promql
# Deployments per hour (successful only)
sum(rate(argocd_app_sync_total{phase="Succeeded"}[1h])) by (name) * 3600

# Deployments per day across all applications
sum(increase(argocd_app_sync_total{phase="Succeeded"}[24h]))

# Deployments per day per application
sum(increase(argocd_app_sync_total{phase="Succeeded"}[24h])) by (name)

# Weekly deployment frequency per project
sum(increase(argocd_app_sync_total{phase="Succeeded"}[7d])) by (project)

# Average daily deployment frequency over the last 30 days
sum(increase(argocd_app_sync_total{phase="Succeeded"}[30d])) / 30
```

## Filtering Out Self-Heal Syncs

Self-heal operations are not new deployments. Unfortunately, `argocd_app_sync_total` does not distinguish between sync triggers. To work around this, you need a custom approach.

One option is to use ArgoCD Notifications to push events to a custom counter:

```yaml
# argocd-notifications-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Only trigger on syncs that are NOT self-heal
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      oncePer: app.status.sync.revision
      send: [deployment-event]

  template.deployment-event: |
    webhook:
      deployment-counter:
        method: POST
        body: |
          {
            "app": "{{.app.metadata.name}}",
            "project": "{{.app.spec.project}}",
            "revision": "{{.app.status.sync.revision}}",
            "timestamp": "{{.app.status.operationState.finishedAt}}"
          }

  service.webhook.deployment-counter: |
    url: http://deployment-counter.observability:8080/deployment
    headers:
      - name: Content-Type
        value: application/json
```

The `oncePer: app.status.sync.revision` ensures you only count each unique revision once, filtering out self-heal repeats.

## Building a Deployment Frequency Exporter

For more control, build a custom Prometheus exporter:

```python
# deployment_frequency_exporter.py
import json
import time
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from collections import defaultdict
from datetime import datetime, timedelta, timezone

# Track deployment counts per app per day
daily_deployments = defaultdict(lambda: defaultdict(int))

def fetch_app_history():
    """Fetch sync history from all ArgoCD applications."""
    result = subprocess.run(
        ["argocd", "app", "list", "-o", "json"],
        capture_output=True, text=True
    )
    apps = json.loads(result.stdout)

    for app in apps:
        name = app["metadata"]["name"]
        history = app.get("status", {}).get("history", [])

        for entry in history:
            deployed_at = entry.get("deployedAt", "")
            if not deployed_at:
                continue

            deploy_date = datetime.fromisoformat(
                deployed_at.replace("Z", "+00:00")
            ).strftime("%Y-%m-%d")

            daily_deployments[name][deploy_date] += 1

def build_metrics():
    """Generate Prometheus metrics from deployment history."""
    lines = [
        "# HELP argocd_deployment_frequency "
        "Number of deployments per day per application",
        "# TYPE argocd_deployment_frequency gauge",
    ]

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (
        datetime.now(timezone.utc) - timedelta(days=1)
    ).strftime("%Y-%m-%d")

    for app_name, dates in daily_deployments.items():
        # Today's count
        count_today = dates.get(today, 0)
        lines.append(
            f'argocd_deployment_frequency'
            f'{{app="{app_name}",period="today"}} '
            f'{count_today}'
        )

        # Yesterday's count
        count_yesterday = dates.get(yesterday, 0)
        lines.append(
            f'argocd_deployment_frequency'
            f'{{app="{app_name}",period="yesterday"}} '
            f'{count_yesterday}'
        )

        # Last 7 days average
        week_total = sum(
            dates.get(
                (datetime.now(timezone.utc) - timedelta(days=i)
                ).strftime("%Y-%m-%d"), 0
            )
            for i in range(7)
        )
        lines.append(
            f'argocd_deployment_frequency'
            f'{{app="{app_name}",period="7d_avg"}} '
            f'{week_total / 7:.2f}'
        )

    return "\n".join(lines) + "\n"

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/metrics":
            fetch_app_history()
            body = build_metrics().encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(body)

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8080), MetricsHandler)
    print("Deployment frequency exporter on :8080")
    server.serve_forever()
```

## Grafana Dashboard for Deployment Frequency

Create a Grafana dashboard with these panels:

```json
{
  "panels": [
    {
      "title": "Deployments Today",
      "type": "stat",
      "targets": [{
        "expr": "sum(increase(argocd_app_sync_total{phase='Succeeded'}[24h]))"
      }]
    },
    {
      "title": "Deployments Per Day (Last 30 Days)",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(increase(argocd_app_sync_total{phase='Succeeded'}[24h]))",
        "legendFormat": "All Apps"
      }]
    },
    {
      "title": "Deployment Frequency by Application",
      "type": "bargauge",
      "targets": [{
        "expr": "sum(increase(argocd_app_sync_total{phase='Succeeded'}[7d])) by (name)",
        "legendFormat": "{{name}}"
      }]
    },
    {
      "title": "Deployment Frequency by Project",
      "type": "piechart",
      "targets": [{
        "expr": "sum(increase(argocd_app_sync_total{phase='Succeeded'}[30d])) by (project)",
        "legendFormat": "{{project}}"
      }]
    }
  ]
}
```

## Alerting on Low Deployment Frequency

Set up alerts when deployment frequency drops below expected levels:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-deployment-frequency
  namespace: argocd
spec:
  groups:
    - name: deployment-frequency
      rules:
        - alert: LowDeploymentFrequency
          # No deployments in the last 48 hours
          expr: >
            sum(increase(
              argocd_app_sync_total{phase="Succeeded"}[48h]
            )) == 0
          for: 1h
          labels:
            severity: info
          annotations:
            summary: "No deployments in the last 48 hours"
            description: >
              There have been no successful deployments across
              all ArgoCD applications in the last 48 hours.
              This may indicate a delivery pipeline issue.

        - alert: DeploymentFrequencyDrop
          # Frequency dropped by 50% compared to last week
          expr: >
            sum(increase(
              argocd_app_sync_total{phase="Succeeded"}[7d]
            ))
            /
            sum(increase(
              argocd_app_sync_total{phase="Succeeded"}[7d]
              offset 7d
            ))
            < 0.5
          for: 1d
          labels:
            severity: warning
          annotations:
            summary: "Deployment frequency dropped significantly"
```

## Interpreting Deployment Frequency

According to DORA research:

| Performance Level | Deployment Frequency |
|---|---|
| Elite | On-demand (multiple per day) |
| High | Between once per day and once per week |
| Medium | Between once per week and once per month |
| Low | Less than once per month |

When analyzing your ArgoCD deployment frequency, consider:

- **Spiky patterns** might indicate batch deployments rather than continuous delivery
- **Low frequency on specific apps** could mean those apps need better CI/CD automation
- **High frequency with high failure rate** suggests you need better testing before sync

## Summary

Monitoring deployment frequency in ArgoCD is essential for understanding your delivery velocity. Use `argocd_app_sync_total` as your foundation, filter out self-heal operations for accurate DORA metrics, and build dashboards that give both team-level and application-level views. Tracking this metric over time helps you spot delivery pipeline issues early and measure the impact of process improvements.

For related DORA metrics, check out our guides on [monitoring change failure rate](https://oneuptime.com/blog/post/2026-02-26-argocd-monitor-change-failure-rate/view) and [monitoring mean time to recovery](https://oneuptime.com/blog/post/2026-02-26-argocd-monitor-mean-time-recovery/view).
