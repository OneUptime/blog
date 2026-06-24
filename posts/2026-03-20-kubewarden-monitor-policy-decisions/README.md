# How to Monitor Kubewarden Policy Decisions - Policy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, Monitoring, Observability

Description: Learn how to monitor Kubewarden policy decisions using OpenTelemetry, Prometheus metrics, and audit logging to gain visibility into your admission control activity.

## Introduction

Monitoring Kubewarden policy decisions is essential for understanding your security posture, identifying policy violations, debugging unexpected denials, and auditing compliance. Kubewarden provides Prometheus metrics and OpenTelemetry tracing for admission decisions, and its audit scanner can continuously evaluate existing resources and store the results as reports.

This guide covers setting up comprehensive monitoring for Kubewarden policy decisions.

## Prerequisites

- Kubewarden installed and running
- Prometheus Operator or monitoring stack (optional)
- OpenTelemetry Operator (optional for metrics and tracing)
- `kubectl` access to your cluster

## Kubewarden Observability Features

Kubewarden exposes:
1. **Prometheus metrics**: Counters and latency histograms for policy evaluations
2. **OpenTelemetry traces**: Distributed tracing for policy evaluation
3. **Audit scanner reports**: `Report` and `ClusterReport` resources for background audits

## Configuring Prometheus Metrics

### Enabling Metrics on PolicyServer

```yaml
# kubewarden-values.yaml
telemetry:
  mode: sidecar
  metrics: True
  sidecar:
    metrics:
      port: 8080
```

### Creating a ServiceMonitor

```yaml
# kubewarden-service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubewarden-policy-server
  namespace: kubewarden
  labels:
    # Match your Prometheus operator's selector
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      app.kubernetes.io/instance: policy-server-default
      app.kubernetes.io/component: policy-server
  namespaceSelector:
    matchNames:
      - kubewarden
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
```

### Key Kubewarden Metrics

```bash
# View available Kubewarden metrics
kubectl port-forward -n kubewarden \
  service/policy-server-default \
  8080:8080

# Access metrics endpoint
curl http://localhost:8080/metrics | grep kubewarden
```

Key metrics to monitor:
- `kubewarden_policy_evaluations_total`: Total policy evaluations labeled by policy name, decision, mutation status, and request origin
- `kubewarden_policy_evaluation_latency_milliseconds`: Histogram of policy evaluation latency

## Configuring OpenTelemetry Tracing

```yaml
# kubewarden-values.yaml
telemetry:
  mode: sidecar
  metrics: True
  tracing: True
  sidecar:
    metrics:
      port: 8080
    tracing:
      jaeger:
        endpoint: "my-open-telemetry-collector.jaeger.svc.cluster.local:4317"
        tls:
          insecure: true
```

### Installing OpenTelemetry Collector

With `telemetry.mode: sidecar`, Kubewarden uses an `OpenTelemetryCollector` resource like the following:

```yaml
# otel-collector.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: kubewarden
  namespace: kubewarden
spec:
  mode: sidecar
  config:
    receivers:
      otlp:
        protocols:
          grpc: {}

    processors:
      batch: {}

    exporters:
      prometheus:
        endpoint: ":8080"
      otlp/jaeger:
        endpoint: my-open-telemetry-collector.jaeger.svc.cluster.local:4317
        tls:
          insecure: true

    service:
      pipelines:
        metrics:
          receivers: [otlp]
          processors: []
          exporters: [prometheus]
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp/jaeger]
```

## Monitoring Background Audit Results

In current Kubewarden releases, when the audit scanner is enabled, Kubewarden stores background audit results in OpenReports `Report` and `ClusterReport` resources:

```bash
# List namespace-scoped audit reports
kubectl get report -A -o wide

# List cluster-scoped audit reports
kubectl get clusterreport -o wide

# Inspect the details of a specific report
kubectl get report <report-name> -n <namespace> -o yaml
```

## Creating Prometheus Alerts for Policy Violations

```yaml
# kubewarden-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubewarden-policy-alerts
  namespace: kubewarden
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: kubewarden.rules
      interval: 30s
      rules:
        # Alert on high policy denial rate
        - alert: KubewardenHighDenialRate
          expr: |
            (
              sum by (policy_name) (
                rate(kubewarden_policy_evaluations_total{
                  accepted="false",
                  request_origin="validate"
                }[5m])
              )
              /
              sum by (policy_name) (
                rate(kubewarden_policy_evaluations_total{
                  request_origin="validate"
                }[5m])
              )
            ) > 0.10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High policy denial rate detected"
            description: "Policy {{ $labels.policy_name }} is denying more than 10% of admission requests"

        # Alert if PolicyServer is down
        - alert: KubewardenPolicyServerDown
          expr: |
            up{namespace="kubewarden", service="policy-server-default", endpoint="metrics"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Kubewarden PolicyServer is down"

        # Alert on slow policy evaluations
        - alert: KubewardenSlowPolicyEvaluation
          expr: |
            histogram_quantile(0.99,
              sum by (le, policy_name) (
                rate(kubewarden_policy_evaluation_latency_milliseconds_bucket[5m])
              )
            ) > 1000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Slow Kubewarden policy evaluations"
```

## Creating a Policy Compliance Dashboard Script

```bash
#!/bin/bash
# kubewarden-compliance-report.sh

echo "=== Kubewarden Policy Compliance Report ==="
echo "Date: $(date)"
echo ""

echo "--- Active Policies ---"
kubectl get clusteradmissionpolicies \
  -o custom-columns=\
'NAME:.metadata.name,\
MODULE:.spec.module,\
MODE:.spec.mode,\
MUTATING:.spec.mutating,\
ACTIVE:.status.conditions[?(@.type=="PolicyActive")].status'

echo ""
echo "--- Recent Audit Reports ---"
kubectl get report -A \
  --sort-by='.metadata.creationTimestamp' \
  -o custom-columns=\
'TIME:.metadata.creationTimestamp,\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
FAIL:.summary.fail,\
PASS:.summary.pass'

echo ""
echo "--- Recent Cluster Audit Reports ---"
kubectl get clusterreport \
  --sort-by='.metadata.creationTimestamp' \
  -o custom-columns=\
'TIME:.metadata.creationTimestamp,\
NAME:.metadata.name,\
FAIL:.summary.fail,\
PASS:.summary.pass'

echo ""
echo "--- Policies in Monitor Mode (review needed) ---"
kubectl get clusteradmissionpolicies \
  -o jsonpath='{range .items[?(@.spec.mode=="monitor")]}{.metadata.name}: MONITOR MODE - review violations before enforcing{"\n"}{end}'
```

## Conclusion

Comprehensive monitoring of Kubewarden policy decisions transforms your admission control from a black box into a transparent, auditable security layer. By combining Prometheus metrics for trends, OpenTelemetry traces for debugging, audit scanner reports for background compliance checks, and automated alerts for anomalies, you maintain full visibility into how your policies are performing. This observability foundation is especially important during policy rollout phases when you need to understand the impact of new policies before enabling enforcement mode.
