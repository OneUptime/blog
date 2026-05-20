# How to Create Custom ArgoCD Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Prometheus, Monitoring

Description: Learn how to create custom Prometheus metrics for ArgoCD to track business-specific KPIs, deployment patterns, and operational insights beyond built-in metrics.

---

ArgoCD ships with a solid set of built-in Prometheus metrics covering sync status, health, git operations, and reconciliation times. But every team has unique requirements that the default metrics do not cover. Maybe you need to track deployment costs, measure team velocity by namespace, or count how often specific Helm values change.

Custom metrics let you extend ArgoCD's observability to answer the questions that matter most to your organization.

## Built-in Metrics as a Foundation

Before creating custom metrics, understand what ArgoCD already provides:

```promql
# Application health and sync status

argocd_app_info

# Sync operation counts
argocd_app_sync_total

# Reconciliation performance
argocd_app_reconcile_bucket
argocd_app_reconcile_sum
argocd_app_reconcile_count

# Git operations
argocd_git_request_total
argocd_git_request_duration_seconds_bucket
argocd_git_request_duration_seconds_sum
argocd_git_request_duration_seconds_count
argocd_git_fetch_fail_total

# Repo server
argocd_repo_pending_request_total

# Cluster connectivity
argocd_cluster_api_resource_objects
argocd_cluster_api_resources
argocd_cluster_cache_age_seconds
```

If your question can be answered by combining these with PromQL, start there before building custom exporters.

## Approach 1: Prometheus Recording Rules

The simplest way to create custom metrics is with recording rules that derive new metrics from existing ones:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-custom-metrics
  namespace: argocd
spec:
  groups:
    - name: argocd-custom
      interval: 1m
      rules:
        # Percentage of healthy apps per project
        - record: argocd:project_health_ratio
          expr: >
            count(argocd_app_info{health_status="Healthy"})
            by (project)
            /
            count(argocd_app_info) by (project)

        # Sync success rate per application (7-day window)
        - record: argocd:app_sync_success_rate
          expr: >
            sum(increase(
              argocd_app_sync_total{phase="Succeeded"}[7d]
            )) by (name)
            /
            clamp_min(sum(increase(
              argocd_app_sync_total[7d]
            )) by (name), 1)

        # Average sync operations per hour per project
        - record: argocd:project_sync_rate
          expr: >
            sum(rate(
              argocd_app_sync_total{phase="Succeeded"}[1h]
            )) by (project) * 3600

        # Git fetch failures per hour
        - record: argocd:git_fetch_failures_per_hour
          expr: >
            rate(argocd_git_fetch_fail_total[1h]) * 3600

        # Number of out-of-sync apps (drift indicator)
        - record: argocd:drift_count
          expr: >
            count(
              argocd_app_info{sync_status="OutOfSync"}
            )

        # Cluster resource saturation
        - record: argocd:cluster_resource_count
          expr: >
            sum(argocd_cluster_api_resource_objects)
            by (server)
```

## Approach 2: Custom Exporter Sidecar

For metrics that require querying the ArgoCD API or processing application manifests, build a custom exporter:

```python
# argocd_custom_exporter.py
import json
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from collections import defaultdict

def get_argocd_apps():
    """Fetch all ArgoCD applications."""
    result = subprocess.run(
        ["argocd", "app", "list", "--core", "-o", "json"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

def calculate_custom_metrics(apps):
    """Calculate custom metrics from app data."""
    metrics = []

    # Count apps by source type
    source_types = defaultdict(int)
    # Count apps by destination namespace
    namespace_counts = defaultdict(int)

    for app in apps:
        name = app["metadata"]["name"]
        spec = app.get("spec", {})
        status = app.get("status", {})

        # Source type classification
        sources = spec.get("sources") or []
        source = spec.get("source") or (sources[0] if sources else {})
        if source.get("chart"):
            source_types["helm"] += 1
        elif source.get("kustomize"):
            source_types["kustomize"] += 1
        elif source.get("directory"):
            source_types["directory"] += 1
        elif source.get("plugin"):
            source_types["plugin"] += 1
        else:
            source_types["plain_yaml"] += 1

        # Destination namespace
        dest = spec.get("destination", {})
        ns = dest.get("namespace", "default")
        namespace_counts[ns] += 1

        # Track number of resources per app
        resource_count = len(
            status.get("resources", [])
        )
        metrics.append(
            f'argocd_custom_app_resources'
            f'{{name="{name}"}} {resource_count}'
        )

        # Track auto-sync enabled
        sync_policy = spec.get("syncPolicy", {})
        auto_sync = 1 if sync_policy.get("automated") else 0
        metrics.append(
            f'argocd_custom_auto_sync_enabled'
            f'{{name="{name}"}} {auto_sync}'
        )

        # Track self-heal enabled
        self_heal = 0
        if sync_policy.get("automated", {}).get("selfHeal"):
            self_heal = 1
        metrics.append(
            f'argocd_custom_self_heal_enabled'
            f'{{name="{name}"}} {self_heal}'
        )

        # Track prune enabled
        prune = 0
        if sync_policy.get("automated", {}).get("prune"):
            prune = 1
        metrics.append(
            f'argocd_custom_prune_enabled'
            f'{{name="{name}"}} {prune}'
        )

    # Add source type counts
    for src_type, count in source_types.items():
        metrics.append(
            f'argocd_custom_apps_by_source_type'
            f'{{source_type="{src_type}"}} {count}'
        )

    # Add namespace counts
    for ns, count in namespace_counts.items():
        metrics.append(
            f'argocd_custom_apps_by_namespace'
            f'{{namespace="{ns}"}} {count}'
        )

    return metrics

def build_prometheus_output(metrics):
    """Format metrics as Prometheus exposition format."""
    headers = [
        "# HELP argocd_custom_app_resources "
        "Number of Kubernetes resources per app",
        "# TYPE argocd_custom_app_resources gauge",
        "# HELP argocd_custom_auto_sync_enabled "
        "Whether auto-sync is enabled (1=yes, 0=no)",
        "# TYPE argocd_custom_auto_sync_enabled gauge",
        "# HELP argocd_custom_self_heal_enabled "
        "Whether self-heal is enabled (1=yes, 0=no)",
        "# TYPE argocd_custom_self_heal_enabled gauge",
        "# HELP argocd_custom_prune_enabled "
        "Whether prune is enabled (1=yes, 0=no)",
        "# TYPE argocd_custom_prune_enabled gauge",
        "# HELP argocd_custom_apps_by_source_type "
        "Count of apps by manifest source type",
        "# TYPE argocd_custom_apps_by_source_type gauge",
        "# HELP argocd_custom_apps_by_namespace "
        "Count of apps by destination namespace",
        "# TYPE argocd_custom_apps_by_namespace gauge",
    ]
    return "\n".join(headers + metrics) + "\n"

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/metrics":
            apps = get_argocd_apps()
            metrics = calculate_custom_metrics(apps)
            body = build_prometheus_output(metrics).encode()
            self.send_response(200)
            self.send_header(
                "Content-Type", "text/plain"
            )
            self.end_headers()
            self.wfile.write(body)

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8080), MetricsHandler)
    print("Custom metrics exporter on :8080")
    server.serve_forever()
```

Deploy it alongside ArgoCD:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-custom-exporter
  namespace: argocd
spec:
  replicas: 1
  selector:
    matchLabels:
      app: argocd-custom-exporter
  template:
    metadata:
      labels:
        app: argocd-custom-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      serviceAccountName: argocd-server
      containers:
        - name: exporter
          image: your-registry/argocd-custom-exporter:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

## Approach 3: ArgoCD Resource Customizations

Use ArgoCD's resource customizations to add health checks that feed the built-in application health metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.useOpenLibs.apps_Deployment: "true"
  # Custom health check that exposes additional metadata
  resource.customizations.health.apps_Deployment: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.replicas ~= nil and
         obj.status.readyReplicas ~= nil then
        if obj.status.readyReplicas == obj.status.replicas then
          hs.status = "Healthy"
        else
          hs.status = "Progressing"
        end
        hs.message = string.format(
          "%d/%d replicas ready",
          obj.status.readyReplicas,
          obj.status.replicas
        )
      end
    end
    return hs
```

## Approach 4: Notification-Based Metrics

Use ArgoCD Notifications to emit custom metrics through webhook:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-any-sync: |
    - when: "true"
      send: [custom-metrics-event]

  template.custom-metrics-event: |
    webhook:
      custom-metrics:
        method: POST
        body: |
          {
            "app_name": "{{.app.metadata.name}}",
            "project": "{{.app.spec.project}}",
            "source_type": "{{.app.spec.source.chart | default "directory"}}",
            "dest_namespace": "{{.app.spec.destination.namespace}}",
            "dest_cluster": "{{.app.spec.destination.server}}",
            "health": "{{.app.status.health.status}}",
            "sync": "{{.app.status.sync.status}}",
            "revision": "{{.app.status.sync.revision}}",
            "resource_count": "{{len .app.status.resources}}"
          }

  service.webhook.custom-metrics: |
    url: http://argocd-custom-exporter:8080/events
    headers:
      - name: Content-Type
        value: application/json

  subscriptions: |
    - recipients:
        - custom-metrics
      triggers:
        - on-any-sync
```

## Useful Custom Metric Ideas

Here are metrics that teams commonly find valuable:

| Custom Metric | Purpose |
|---|---|
| Apps per namespace | Identify over-provisioned namespaces |
| Resource count per app | Spot complexity hotspots |
| Auto-sync adoption rate | Track GitOps maturity |
| Source type distribution | Understand tooling preferences |
| Sync frequency by time of day | Identify peak deployment windows |
| Image tag patterns | Detect teams using `latest` tags |
| Drift frequency per app | Find apps with configuration issues |

## Summary

Custom ArgoCD metrics extend your observability beyond what the built-in metrics provide. Start with recording rules for derived metrics, move to custom exporters for complex calculations, and use notification webhooks for event-driven metrics. The goal is to answer the specific questions your organization cares about, whether that is deployment velocity by team, cost tracking by namespace, or GitOps maturity across the organization.
