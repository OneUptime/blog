# How to Monitor Flagger Canary Progress with Grafana

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, flagger, Canary, Grafana, Monitoring, Prometheus, Kubernetes, Dashboard

Description: A step-by-step guide to setting up Grafana dashboards for monitoring Flagger canary deployment progress in a Flux CD managed cluster.

---

## Introduction

When running canary deployments with Flagger in a Flux CD environment, visibility into the deployment progress is essential. Grafana provides powerful dashboarding capabilities that let you watch canary analysis in real time, track traffic shifting, and understand why rollbacks occur.

This guide walks through setting up Grafana dashboards specifically designed for monitoring Flagger canary deployments.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- Flagger installed and configured
- Prometheus installed for metrics collection
- Grafana installed (or ready to install via Flux)
- At least one Flagger Canary resource deployed

## Step 1: Deploy Grafana with Flux

If Grafana is not already installed, deploy it using a Flux HelmRelease.

```yaml
# monitoring/grafana/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: monitoring
spec:
  interval: 1h
  url: https://grafana.github.io/helm-charts
```

```yaml
# monitoring/grafana/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: grafana
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: grafana
      version: "7.x"
      sourceRef:
        kind: HelmRepository
        name: grafana
      interval: 1h
  values:
    # Enable persistence for dashboard storage
    persistence:
      enabled: true
      size: 10Gi
    # Configure Prometheus as a data source
    datasources:
      datasources.yaml:
        apiVersion: 1
        datasources:
          - name: Prometheus
            type: prometheus
            url: http://prometheus-server.monitoring:9090
            access: proxy
            isDefault: true
    # Load dashboards from ConfigMaps
    dashboardProviders:
      dashboardproviders.yaml:
        apiVersion: 1
        providers:
          - name: flagger
            orgId: 1
            folder: Flagger
            type: file
            disableDeletion: false
            editable: true
            options:
              path: /var/lib/grafana/dashboards/flagger
    sidecar:
      dashboards:
        enabled: true
        label: grafana_dashboard
        folderAnnotation: grafana_folder
```

## Step 2: Configure Prometheus to Scrape Flagger Metrics

Flagger exposes Prometheus metrics that track canary state and progress.

```yaml
# monitoring/prometheus/additional-scrape-configs.yaml
apiVersion: v1
kind: Secret
metadata:
  name: additional-scrape-configs
  namespace: monitoring
stringData:
  additional-scrape-configs.yaml: |
    # Scrape Flagger metrics
    - job_name: flagger
      kubernetes_sd_configs:
        - role: pod
          namespaces:
            names:
              - flagger-system
      relabel_configs:
        - source_labels: [__meta_kubernetes_pod_label_app]
          regex: flagger
          action: keep
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
          action: replace
          target_label: __address__
          regex: (.+)
          replacement: ${1}:8080
```

## Step 3: Key Flagger Metrics to Monitor

Flagger exposes several critical metrics. Here are the most important ones:

```text
# Canary status: 0=initialized, 1=progressing, 2=promoting, 3=finalising, 4=succeeded, 5=failed
flagger_canary_status

# Total weight currently assigned to the canary
flagger_canary_weight

# Number of canary analysis iterations completed
flagger_canary_iteration

# Total number of canary operations
flagger_canary_total

# Duration of canary analysis in seconds
flagger_canary_duration_seconds
```

## Step 4: Create the Canary Overview Dashboard

Create a ConfigMap containing the Grafana dashboard JSON.

```yaml
# monitoring/grafana/dashboards/canary-overview.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flagger-canary-overview
  namespace: monitoring
  labels:
    grafana_dashboard: "true"
  annotations:
    grafana_folder: "Flagger"
data:
  canary-overview.json: |
    {
      "dashboard": {
        "title": "Flagger Canary Overview",
        "uid": "flagger-canary-overview",
        "timezone": "browser",
        "refresh": "10s",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "query",
              "query": "label_values(flagger_canary_status, namespace)",
              "datasource": "Prometheus"
            },
            {
              "name": "canary",
              "type": "query",
              "query": "label_values(flagger_canary_status{namespace=\"$namespace\"}, name)",
              "datasource": "Prometheus"
            }
          ]
        }
      }
    }
```

## Step 5: Build Essential Dashboard Panels

Here are the PromQL queries for each panel in your dashboard.

### Panel 1: Canary Status Indicator

```promql
# Shows current canary status as a stat panel
# Map: 0=Initialized, 1=Progressing, 2=Promoting, 3=Finalising, 4=Succeeded, 5=Failed
flagger_canary_status{
  namespace="$namespace",
  name="$canary"
}
```

### Panel 2: Traffic Weight Over Time

```promql
# Shows the traffic weight assigned to the canary over time
# Useful for visualizing the progressive traffic shift
flagger_canary_weight{
  namespace="$namespace",
  name="$canary"
}
```

### Panel 3: Request Success Rate

```promql
# Calculate the success rate of requests to the canary
# This uses Istio metrics; adjust for your service mesh
sum(
  rate(
    istio_requests_total{
      destination_workload_namespace="$namespace",
      destination_workload=~"$canary",
      response_code!~"5.*"
    }[1m]
  )
)
/
sum(
  rate(
    istio_requests_total{
      destination_workload_namespace="$namespace",
      destination_workload=~"$canary"
    }[1m]
  )
) * 100
```

### Panel 4: Request Duration (P99 Latency)

```promql
# P99 latency for the canary workload
histogram_quantile(0.99,
  sum(
    rate(
      istio_request_duration_milliseconds_bucket{
        destination_workload_namespace="$namespace",
        destination_workload=~"$canary"
      }[1m]
    )
  ) by (le)
)
```

### Panel 5: Canary vs Primary Comparison

```promql
# Primary request rate
sum(
  rate(
    istio_requests_total{
      destination_workload_namespace="$namespace",
      destination_workload="$canary-primary"
    }[1m]
  )
)

# Canary request rate
sum(
  rate(
    istio_requests_total{
      destination_workload_namespace="$namespace",
      destination_workload="$canary"
    }[1m]
  )
)
```

### Panel 6: Deployment History

```promql
# Track total canary promotions and rollbacks over time
# Successful promotions
sum(flagger_canary_total{namespace="$namespace", name="$canary", status="successful"})

# Failed rollbacks
sum(flagger_canary_total{namespace="$namespace", name="$canary", status="failed"})
```

## Step 6: Create Alert Rules for Canary Failures

Set up Grafana alerts to notify your team when canary deployments fail.

```yaml
# monitoring/grafana/alerts/canary-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flagger-alert-rules
  namespace: monitoring
  labels:
    grafana_dashboard: "true"
data:
  canary-alerts.json: |
    {
      "groups": [
        {
          "name": "flagger-canary-alerts",
          "rules": [
            {
              "alert": "CanaryRollbackDetected",
              "expr": "flagger_canary_status == 5",
              "for": "1m",
              "labels": {
                "severity": "warning"
              },
              "annotations": {
                "summary": "Canary rollback detected for {{ $labels.name }}",
                "description": "Canary {{ $labels.name }} in namespace {{ $labels.namespace }} has been rolled back."
              }
            },
            {
              "alert": "CanaryStuck",
              "expr": "flagger_canary_status == 1 and flagger_canary_weight == 0",
              "for": "30m",
              "labels": {
                "severity": "warning"
              },
              "annotations": {
                "summary": "Canary {{ $labels.name }} appears stuck",
                "description": "Canary {{ $labels.name }} has been progressing for 30 minutes without weight increase."
              }
            }
          ]
        }
      ]
    }
```

## Step 7: Configure Flagger to Send Events to Grafana Annotations

Flagger can send webhook notifications that you can capture as Grafana annotations.

```yaml
# flagger/alert-provider.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: grafana
  namespace: production
spec:
  type: grafana
  address: http://grafana.monitoring
  # Secret containing the Grafana API key
  secretRef:
    name: grafana-api-key
---
apiVersion: v1
kind: Secret
metadata:
  name: grafana-api-key
  namespace: production
stringData:
  # Replace with your actual Grafana API key
  token: "your-grafana-api-key-here"
```

Reference the alert provider in your Canary resource:

```yaml
# apps/my-app/canary.yaml (add to spec section)
spec:
  analysis:
    alerts:
      - name: "grafana-annotation"
        severity: info
        providerRef:
          name: grafana
          namespace: production
```

## Step 8: Deploy Everything with Flux Kustomization

```yaml
# flux/monitoring-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./monitoring
  prune: true
  dependsOn:
    - name: prometheus
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: grafana
      namespace: monitoring
```

## Step 9: Verify the Dashboard Setup

After Flux reconciles, verify everything is working.

```bash
# Check that Grafana is running
kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana

# Port-forward to access Grafana locally
kubectl port-forward -n monitoring svc/grafana 3000:80

# Verify Flagger metrics are available in Prometheus
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
# Navigate to http://localhost:9090 and query: flagger_canary_status

# Check that dashboard ConfigMaps are created
kubectl get configmaps -n monitoring -l grafana_dashboard=true
```

## Step 10: Reading the Dashboard During a Canary Release

When a canary deployment is in progress, here is what to look for on your dashboard:

1. **Status Panel**: Should show "Progressing" (value 1) during analysis
2. **Weight Panel**: Should show a staircase pattern as traffic shifts incrementally
3. **Success Rate**: Should remain above your configured threshold (e.g., 99%)
4. **Latency**: Should remain below your configured maximum (e.g., 500ms)
5. **Annotations**: Should show Flagger events marking each analysis step

If the canary succeeds, the status transitions through Promoting (2) and Finalising (3) to Succeeded (4). If it fails, you will see status 5 and the weight drops back to 0.

## Troubleshooting

### No Metrics Appearing in Grafana

```bash
# Verify Prometheus is scraping Flagger
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
# Check Targets page for flagger job

# Verify Flagger is exposing metrics
kubectl port-forward -n flagger-system deployment/flagger 8080:8080
curl http://localhost:8080/metrics | grep flagger_canary
```

### Dashboard Not Loading

```bash
# Check that the ConfigMap is properly labeled
kubectl get configmap flagger-canary-overview -n monitoring --show-labels

# Restart Grafana sidecar to pick up new dashboards
kubectl rollout restart deployment/grafana -n monitoring
```

## Summary

Monitoring Flagger canary progress with Grafana gives you real-time visibility into progressive deployments. By combining Flagger's built-in Prometheus metrics with custom PromQL queries, you can build comprehensive dashboards that show canary status, traffic weight progression, success rates, and latency. Adding Grafana annotations from Flagger events creates a complete audit trail of every deployment. This setup, managed entirely through Flux GitOps, ensures your monitoring configuration is version-controlled and reproducible.
