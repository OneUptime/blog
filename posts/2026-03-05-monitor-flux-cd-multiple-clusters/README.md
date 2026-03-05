# How to Monitor Flux CD Across Multiple Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Cluster, Monitoring, Observability, Prometheus

Description: Learn how to set up centralized monitoring for Flux CD across multiple Kubernetes clusters using Prometheus, Grafana, and Flux notifications.

---

Managing Flux CD across multiple Kubernetes clusters introduces monitoring challenges. Each cluster runs its own set of Flux controllers, and understanding the health and reconciliation status across all of them requires a centralized monitoring approach. This guide covers setting up cross-cluster observability for Flux.

## Monitoring Architecture

A common architecture for multi-cluster Flux monitoring consists of:

1. **Each cluster**: Flux controllers expose Prometheus metrics locally. A Prometheus agent or remote-write configuration forwards metrics to a central store.
2. **Central monitoring cluster**: Receives metrics from all clusters. Runs Grafana for visualization and Alertmanager for alerting.
3. **Flux notifications**: Each cluster's notification-controller sends alerts to a shared channel.

## Configuring Prometheus Remote Write

In each cluster, configure Prometheus (or a Prometheus-compatible agent) to scrape Flux controller metrics and forward them to a central Thanos, Cortex, or Grafana Mimir instance.

### Prometheus Agent Configuration

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: prometheus
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "56.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  values:
    prometheus:
      prometheusSpec:
        externalLabels:
          cluster: production-us-east-1
        remoteWrite:
          - url: https://mimir.monitoring.example.com/api/v1/push
            headers:
              X-Scope-OrgID: flux-monitoring
        serviceMonitorSelector:
          matchLabels:
            app.kubernetes.io/part-of: flux
```

The `externalLabels.cluster` label is critical. It distinguishes metrics from different clusters in the central store.

### ServiceMonitor for Flux Controllers

Flux controllers expose metrics on port 8080. Create a ServiceMonitor to scrape them:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-controllers
  namespace: flux-system
  labels:
    app.kubernetes.io/part-of: flux
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  endpoints:
    - port: http-prom
      interval: 30s
      path: /metrics
```

## Key Metrics for Multi-Cluster Monitoring

### Reconciliation Status

```promql
# Ready status across all clusters
sum by (cluster, kind, name, namespace) (
  gotk_reconcile_condition{type="Ready", status="True"}
)

# Failed reconciliations by cluster
sum by (cluster) (
  gotk_reconcile_condition{type="Ready", status="False"}
)
```

### Reconciliation Duration

```promql
# P99 reconciliation duration by cluster
histogram_quantile(0.99,
  sum by (cluster, kind, le) (
    rate(gotk_reconcile_duration_seconds_bucket[5m])
  )
)
```

### Resource Counts

```promql
# Total Flux resources per cluster
count by (cluster, kind) (gotk_reconcile_condition{type="Ready"})
```

## Centralized Grafana Dashboard

Import or create a Grafana dashboard that uses the `cluster` label to provide a multi-cluster view. Here is a dashboard configuration outline:

### Overview Panel - Cluster Health Matrix

```promql
# Percentage of healthy resources per cluster
sum by (cluster) (gotk_reconcile_condition{type="Ready", status="True"})
/
count by (cluster) (gotk_reconcile_condition{type="Ready"})
* 100
```

### Drill-Down Panel - Resources by Status

```promql
# Failed resources with details
gotk_reconcile_condition{type="Ready", status="False"}
```

Use Grafana variables to allow selecting a specific cluster:

```
label_values(gotk_reconcile_condition, cluster)
```

## Centralized Flux Notifications

Configure each cluster's notification-controller to send alerts to shared channels, including the cluster name in the alert.

### Slack Notifications with Cluster Context

In each cluster, create a Provider and Alert:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-central
  namespace: flux-system
spec:
  type: slack
  channel: flux-multi-cluster
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: all-resources
  namespace: flux-system
spec:
  summary: "Cluster: production-us-east-1"
  providerRef:
    name: slack-central
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
    - kind: GitRepository
      name: '*'
```

The `summary` field includes the cluster name so recipients can identify which cluster generated the alert.

### Webhook to Central Alerting System

For a more structured approach, send events to a central webhook endpoint:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: central-webhook
  namespace: flux-system
spec:
  type: generic-hmac
  address: https://alerting.example.com/flux-events
  secretRef:
    name: webhook-hmac-key
```

The central system can aggregate events from all clusters and provide a unified view.

## Using the Flux CLI for Multi-Cluster Checks

If you have kubeconfig contexts for all clusters, you can script health checks:

```bash
#!/bin/bash
CLUSTERS=("production-us-east-1" "production-eu-west-1" "staging-us-east-1")

for cluster in "${CLUSTERS[@]}"; do
  echo "=== Cluster: $cluster ==="
  kubectl --context="$cluster" get kustomizations -A \
    -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,READY:.status.conditions[?(@.type=="Ready")].status' \
    | grep -v True
  echo ""
done
```

This script highlights any Kustomization that is not in a Ready state across all clusters.

## Cross-Cluster Alerting Rules

Define alerting rules in your central Prometheus that correlate data across clusters:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-multi-cluster-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux.multicluster
      rules:
        - alert: FluxClusterUnhealthy
          expr: |
            (sum by (cluster) (gotk_reconcile_condition{type="Ready", status="False"})
            /
            count by (cluster) (gotk_reconcile_condition{type="Ready"}))
            > 0.1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Cluster {{ $labels.cluster }} has more than 10% unhealthy Flux resources"

        - alert: FluxClusterMissing
          expr: absent(gotk_reconcile_condition{cluster="production-us-east-1"})
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "No metrics received from production-us-east-1 cluster"
```

The `FluxClusterMissing` alert detects when a cluster stops sending metrics, which could indicate a connectivity issue or a failed Prometheus agent.

## Best Practices

1. **Consistent labeling**: Use the same `cluster` external label format across all environments. Standardize on a naming convention like `{environment}-{region}`.

2. **Separate alert channels**: Use separate Slack channels or PagerDuty services for production versus non-production clusters to reduce alert fatigue.

3. **Dashboard hierarchy**: Create an overview dashboard showing all clusters, with drill-down dashboards for individual cluster details.

4. **Monitor the monitoring**: Ensure the metrics pipeline itself is monitored. If remote write fails, you lose visibility into that cluster.

5. **Reconciliation SLOs**: Define Service Level Objectives for reconciliation success rates and durations. Alert when SLOs are at risk.

Centralized monitoring of Flux across multiple clusters gives platform teams the visibility needed to maintain reliable GitOps deployments at scale. By combining Prometheus metrics, Grafana dashboards, and Flux notifications, you can detect and respond to issues across your entire fleet from a single pane of glass.
