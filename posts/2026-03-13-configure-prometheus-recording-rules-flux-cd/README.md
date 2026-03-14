# How to Configure Prometheus Recording Rules with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Prometheus, Recording Rules, PrometheusRule, Observability

Description: Manage Prometheus recording rules as code using Flux CD GitOps to pre-compute expensive queries, improve dashboard performance, and create reusable metric aggregations.

---

## Introduction

Prometheus recording rules pre-compute frequently used or computationally expensive expressions and store the results as new time series. This dramatically improves query performance for dashboards and alerts that would otherwise need to evaluate complex expressions on every request against millions of raw data points.

Managing recording rules through Flux CD ensures they are version-controlled and consistently deployed. As your team builds more dashboards and alerting expressions, centralizing recording rules in Git prevents duplication, ensures all environments use the same pre-computed metrics, and allows changes to go through code review before impacting production dashboards.

This guide covers creating PrometheusRule resources with recording rules, organizing them effectively, and deploying them with Flux CD.

## Prerequisites

- Kubernetes cluster with Flux CD v2 bootstrapped
- Prometheus Operator installed (kube-prometheus-stack recommended)
- Git repository connected to Flux
- Basic understanding of PromQL

## Step 1: Create Recording Rules for Common Queries

Define recording rules that pre-compute expensive or frequently used PromQL expressions.

```yaml
# infrastructure/monitoring/recording-rules/api-recording-rules.yaml
# PrometheusRule containing recording rules that pre-compute API metrics
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-recording-rules
  namespace: monitoring
  labels:
    # Label must match the Prometheus Operator's ruleSelector configuration
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: api.rates
    # Evaluate and store these results every 60 seconds
    interval: 60s
    rules:
    # Pre-compute per-service request rate (used by multiple dashboards)
    - record: job:http_requests_total:rate5m
      expr: sum by (job) (rate(http_requests_total[5m]))

    # Pre-compute error ratio per service (used in alerting rules)
    - record: job:http_request_errors:ratio_rate5m
      expr: |
        sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
        /
        sum by (job) (rate(http_requests_total[5m]))

    # Pre-compute p99 latency per service (expensive histogram query)
    - record: job:http_request_duration_seconds:p99_rate5m
      expr: |
        histogram_quantile(0.99,
          sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))
        )
```

## Step 2: Add Infrastructure Recording Rules

Pre-compute cluster-wide infrastructure metrics used across multiple dashboards.

```yaml
# infrastructure/monitoring/recording-rules/cluster-recording-rules.yaml
# Recording rules for cluster-wide resource utilization metrics
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-recording-rules
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: kubernetes.resources
    interval: 60s
    rules:
    # Pre-compute CPU utilization per namespace
    - record: namespace:container_cpu_usage_seconds_total:sum_rate
      expr: |
        sum by (namespace) (
          rate(container_cpu_usage_seconds_total{container!=""}[5m])
        )

    # Pre-compute memory usage per namespace
    - record: namespace:container_memory_working_set_bytes:sum
      expr: |
        sum by (namespace) (
          container_memory_working_set_bytes{container!=""}
        )

    # Pre-compute pod count per node (used in capacity planning dashboards)
    - record: node:kube_pod_info:count
      expr: count by (node) (kube_pod_info{phase="Running"})
```

## Step 3: Organize Recording Rules with Kustomize

Bundle all recording rule files for consistent Flux deployment.

```yaml
# infrastructure/monitoring/recording-rules/kustomization.yaml
# Kustomize manifest grouping all recording rule PrometheusRules
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - api-recording-rules.yaml
  - cluster-recording-rules.yaml
```

```yaml
# clusters/production/recording-rules-kustomization.yaml
# Flux Kustomization deploying all Prometheus recording rules
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus-recording-rules
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/monitoring/recording-rules
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: kube-prometheus-stack
```

## Step 4: Verify Recording Rules Are Active

Confirm that Prometheus has loaded and is evaluating the recording rules.

```bash
# Check that PrometheusRule CRDs are created
kubectl get prometheusrules -n monitoring

# Port-forward to Prometheus UI
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &

# Query the rules API to confirm recording rules are loaded
curl -s http://localhost:9090/api/v1/rules?type=record | \
  jq -r '.data.groups[].rules[].name'

# Query a pre-computed metric to verify it has data
curl -s 'http://localhost:9090/api/v1/query?query=job:http_requests_total:rate5m' | \
  jq '.data.result'

# Check Flux reconciliation status
flux get kustomization prometheus-recording-rules
```

## Best Practices

- Use a consistent naming convention for recording rules: `level:metric_name:operations` (e.g., `job:http_requests_total:rate5m`)
- Set the recording rule evaluation interval to match the scrape interval of the underlying metrics
- Reference recording rules in alerting rules instead of repeating complex expressions
- Create recording rules for any PromQL expression that appears in more than two places
- Review recording rule cardinality; high-cardinality recording rules can increase Prometheus storage significantly

## Conclusion

Prometheus recording rules managed through Flux CD deliver faster dashboards, more reliable alerting, and reduced Prometheus query load. By pre-computing expensive expressions and storing them as new time series, you decouple query complexity from query performance. Flux ensures these rules are consistently deployed across environments, making your monitoring infrastructure as reliable and well-governed as your application deployments.
