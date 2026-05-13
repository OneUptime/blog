# How to Monitor Flux Operator Status with Prometheus Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Flux Operator, Prometheus, Monitoring, Kubernetes, Metric

Description: Learn how to monitor the Flux Operator and FluxInstance status using Prometheus metrics for observability and alerting.

---

## Introduction

Monitoring the Flux Operator and the FluxInstance resources it manages is essential for maintaining a healthy GitOps pipeline. The Flux Operator exposes Prometheus metrics that provide insight into the reconciliation status of FluxInstance resources, Flux component health, and operational issues. By collecting and visualizing these metrics, you can detect problems early, set up alerts for failures, and maintain confidence in your Flux deployments.

This guide covers setting up Prometheus to scrape Flux Operator metrics, understanding the available metrics, creating alerts for common issues, and building dashboards for Flux Operator observability.

## Prerequisites

Before you begin, ensure you have:

- The Flux Operator installed on your Kubernetes cluster.
- Prometheus installed (standalone or via Prometheus Operator).
- `kubectl` installed and configured.
- Optionally, Grafana installed for dashboarding.

## Flux Operator Metrics Endpoint

The Flux Operator exposes Prometheus metrics on a dedicated port. By default, the metrics endpoint is available at `/metrics` on the operator pod.

```bash
# Find the Flux Operator pod

kubectl get pods -n flux-system -l app.kubernetes.io/name=flux-operator

# Port-forward to check available metrics
kubectl port-forward -n flux-system \
  deployment/flux-operator 8080:8080

# Fetch the metrics
curl http://localhost:8080/metrics
```

## Configuring Prometheus to Scrape Flux Operator

### Using Pod Annotations

If your Prometheus is configured to discover scrape targets via pod annotations, ensure the Flux Operator deployment has the correct annotations.

```yaml
# flux-operator-annotations.yaml
# Patch to add Prometheus scrape annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flux-operator
  namespace: flux-system
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
```

### Using ServiceMonitor

If you use the Prometheus Operator, create a ServiceMonitor for the Flux Operator.

```yaml
# flux-operator-servicemonitor.yaml
# ServiceMonitor for the Flux Operator metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-operator
  namespace: flux-system
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: flux-operator
  namespaceSelector:
    matchNames:
      - flux-system
  endpoints:
    - targetPort: 8080
      path: /metrics
      interval: 30s
```

Apply the ServiceMonitor.

```bash
kubectl apply -f flux-operator-servicemonitor.yaml
```

The Flux Operator installation includes a Service that exposes the metrics port. If you use a custom installation and do not have this Service, create one.

```yaml
# flux-operator-metrics-service.yaml
# Service exposing the Flux Operator metrics port
apiVersion: v1
kind: Service
metadata:
  name: flux-operator
  namespace: flux-system
  labels:
    app.kubernetes.io/name: flux-operator
spec:
  selector:
    app.kubernetes.io/name: flux-operator
  ports:
    - name: http
      port: 8080
      targetPort: 8080
      protocol: TCP
```

## Understanding Available Metrics

The Flux Operator exposes several categories of metrics.

### Controller Runtime Metrics

Standard controller-runtime metrics include reconciliation counts, durations, and error rates.

```yaml
# Key controller-runtime metrics
# Total reconciliation attempts
controller_runtime_reconcile_total{controller="fluxinstance"}

# Total reconciliation errors
controller_runtime_reconcile_errors_total{controller="fluxinstance"}

# Reconciliation duration
controller_runtime_reconcile_time_seconds_bucket{controller="fluxinstance"}

# Work queue depth
workqueue_depth{name="fluxinstance"}
```

### FluxInstance Status Metrics

Metrics that reflect the status of FluxInstance resources.

```yaml
# FluxInstance readiness
# The ready label is True, False, or Unknown
flux_instance_info{name="flux",exported_namespace="flux-system",ready="True"}

# FluxInstance information including the installed revision
flux_instance_info{name="flux",exported_namespace="flux-system",revision="v2.3.0@sha256:..."}
```

### Flux Component Metrics

The Flux Operator also exports metrics for Flux resources found in the cluster.

```yaml
# Source resource readiness
flux_resource_info{kind="GitRepository",name="flux-system",exported_namespace="flux-system",ready="True"}

# Kustomize resource readiness
flux_resource_info{kind="Kustomization",exported_namespace="flux-system",ready="True"}

# Resource suspension status
flux_resource_info{kind="Kustomization",exported_namespace="flux-system",suspended="False"}
```

## Creating Prometheus Alert Rules

Set up alert rules to detect Flux Operator and FluxInstance issues.

```yaml
# flux-operator-alerts.yaml
# PrometheusRule for Flux Operator alerting
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-operator-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
    - name: flux-operator
      rules:
        - alert: FluxInstanceNotReady
          expr: flux_instance_info{ready!="True"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "FluxInstance {{ $labels.name }} in {{ $labels.exported_namespace }} is not ready"
            description: "The FluxInstance has been not ready for more than 5 minutes."

        - alert: FluxOperatorReconcileErrors
          expr: rate(controller_runtime_reconcile_errors_total{controller="fluxinstance"}[5m]) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux Operator is encountering reconciliation errors"
            description: "The Flux Operator has been producing reconciliation errors for more than 10 minutes."

        - alert: FluxOperatorHighReconcileLatency
          expr: histogram_quantile(0.99, sum(rate(controller_runtime_reconcile_time_seconds_bucket{controller="fluxinstance"}[5m])) by (le)) > 60
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux Operator reconciliation latency is high"
            description: "P99 reconciliation latency exceeds 60 seconds."

    - name: flux-components
      rules:
        - alert: FluxComponentNotReady
          expr: flux_resource_info{ready!="True"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux resource {{ $labels.kind }}/{{ $labels.name }} in {{ $labels.exported_namespace }} is not ready"

        - alert: FluxReconciliationFailure
          expr: max(flux_resource_info{ready!="True"}) by (exported_namespace, name, kind) == 1
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "Flux reconciliation failure for {{ $labels.kind }}/{{ $labels.name }}"
```

Apply the alert rules.

```bash
kubectl apply -f flux-operator-alerts.yaml
```

## Building a Grafana Dashboard

Create a Grafana dashboard to visualize Flux Operator metrics.

### FluxInstance Status Panel

```yaml
# Grafana panel query for FluxInstance readiness
query: max by (name, exported_namespace) (flux_instance_info{ready="True"}) or on(name, exported_namespace) (0 * max by (name, exported_namespace) (flux_instance_info))
legend: "{{ name }}"
type: stat
thresholds:
  - value: 0
    color: red
  - value: 1
    color: green
```

### Reconciliation Rate Panel

```yaml
# Grafana panel query for reconciliation rate
query: sum(rate(controller_runtime_reconcile_total{controller="fluxinstance"}[5m]))
legend: "reconciliations"
type: timeseries
```

### Reconciliation Latency Panel

```yaml
# Grafana panel query for reconciliation latency percentiles
query: histogram_quantile(0.99, sum(rate(controller_runtime_reconcile_time_seconds_bucket{controller="fluxinstance"}[5m])) by (le))
legend: "P99 Latency"
type: timeseries
```

### Flux Component Health Panel

```yaml
# Grafana panel query for component health
query: flux_resource_info{ready="True"}
legend: "{{ kind }}/{{ name }}"
type: table
```

## Verifying the Monitoring Setup

Confirm that metrics are flowing and alerts are configured.

```bash
# Check Prometheus targets
kubectl port-forward svc/prometheus-operated -n monitoring 9090:9090
# Navigate to http://localhost:9090/targets

# Test a metric query
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=flux_instance_info'

# Check alert rules are loaded
curl -s 'http://localhost:9090/api/v1/rules' | jq '.data.groups[] | select(.name=="flux-operator")'
```

## Conclusion

Monitoring the Flux Operator with Prometheus metrics provides essential visibility into your GitOps infrastructure. By scraping the operator's metrics endpoint, setting up alerts for reconciliation failures and FluxInstance health, and building dashboards for real-time observability, you can maintain confidence in your Flux installations. Combined with Flux resource metrics, this monitoring setup gives you a complete picture of your GitOps pipeline health from the operator level down to individual reconciliation results.
