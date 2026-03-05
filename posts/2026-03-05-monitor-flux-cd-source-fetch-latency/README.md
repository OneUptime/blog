# How to Monitor Flux CD Source Fetch Latency

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Latency, Prometheus, Source Controller

Description: Learn how to track and alert on Flux CD source fetch latency to detect slow Git clones, Helm chart downloads, and OCI artifact pulls that delay your deployments.

---

When Flux CD reconciles your sources -- Git repositories, Helm repositories, OCI repositories, and S3-compatible buckets -- the time it takes to fetch those sources directly impacts how quickly changes reach your cluster. High source fetch latency can delay deployments by minutes, and persistent slowness often points to network issues, oversized repositories, or rate-limiting by upstream registries. This guide covers how to monitor source fetch latency using Prometheus metrics.

## Prerequisites

- Kubernetes cluster with Flux CD installed
- Prometheus scraping Flux CD controller metrics
- Grafana for dashboard visualization

## Key Metrics for Source Fetch Latency

The source-controller exposes the `gotk_reconcile_duration_seconds` metric, which tracks the full reconciliation cycle time including the source fetch. This metric is a histogram with the following labels:

- `kind` -- The source type (GitRepository, HelmRepository, OCIRepository, Bucket)
- `name` -- The name of the source resource
- `namespace` -- The namespace of the source resource
- `exported_namespace` -- The namespace where the resource is defined

## Step 1: Set Up a ServiceMonitor

Ensure your Prometheus instance scrapes the source-controller metrics endpoint:

```yaml
# source-controller-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: source-controller
  namespace: flux-system
spec:
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchLabels:
      app: source-controller
  endpoints:
    - port: http-prom
      interval: 30s
      path: /metrics
```

Apply it:

```bash
# Apply the ServiceMonitor for source-controller
kubectl apply -f source-controller-servicemonitor.yaml
```

## Step 2: Query Source Fetch Duration

Use PromQL to visualize how long source fetches take. The `gotk_reconcile_duration_seconds` histogram gives you percentile breakdowns:

```yaml
# PromQL queries for source fetch latency
# Paste these into Grafana or Prometheus query editor

# P50 (median) reconciliation duration for source resources
# histogram_quantile(0.5, rate(gotk_reconcile_duration_seconds_bucket{kind=~"GitRepository|HelmRepository|OCIRepository|Bucket"}[5m]))

# P95 reconciliation duration for source resources
# histogram_quantile(0.95, rate(gotk_reconcile_duration_seconds_bucket{kind=~"GitRepository|HelmRepository|OCIRepository|Bucket"}[5m]))

# P99 reconciliation duration for source resources
# histogram_quantile(0.99, rate(gotk_reconcile_duration_seconds_bucket{kind=~"GitRepository|HelmRepository|OCIRepository|Bucket"}[5m]))

# Example Grafana panel configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-source-latency-dashboard
  namespace: monitoring
data:
  source-latency.json: |
    {
      "panels": [
        {
          "title": "Source Fetch Latency (P95)",
          "type": "timeseries",
          "targets": [
            {
              "expr": "histogram_quantile(0.95, sum(rate(gotk_reconcile_duration_seconds_bucket{kind=~\"GitRepository|HelmRepository|OCIRepository|Bucket\"}[5m])) by (le, kind, name))",
              "legendFormat": "{{ kind }}/{{ name }}"
            }
          ],
          "fieldConfig": {
            "defaults": {
              "unit": "s"
            }
          }
        }
      ]
    }
```

## Step 3: Break Down Latency by Source Type

Different source types have different latency profiles. Git repositories tend to take longer for initial clones, while Helm repositories can be slow when the index file is large:

```yaml
# PromQL for average reconciliation duration grouped by source kind
# avg(rate(gotk_reconcile_duration_seconds_sum{kind=~"GitRepository|HelmRepository|OCIRepository|Bucket"}[5m])
# /
# rate(gotk_reconcile_duration_seconds_count{kind=~"GitRepository|HelmRepository|OCIRepository|Bucket"}[5m]))
# by (kind)

# Grafana panel for per-source-type latency comparison
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-source-type-latency
  namespace: monitoring
data:
  panel.json: |
    {
      "panels": [
        {
          "title": "Average Fetch Duration by Source Type",
          "type": "bargauge",
          "targets": [
            {
              "expr": "avg by (kind) (rate(gotk_reconcile_duration_seconds_sum{kind=~\"GitRepository|HelmRepository|OCIRepository|Bucket\"}[10m]) / rate(gotk_reconcile_duration_seconds_count{kind=~\"GitRepository|HelmRepository|OCIRepository|Bucket\"}[10m]))",
              "legendFormat": "{{ kind }}"
            }
          ]
        }
      ]
    }
```

## Step 4: Set Up Latency Alerts

Create alerting rules that fire when source fetch latency exceeds acceptable thresholds:

```yaml
# flux-source-latency-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-source-latency-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-source-latency
      rules:
        # Alert when P95 source fetch takes longer than 60 seconds
        - alert: FluxSourceFetchSlow
          expr: |
            histogram_quantile(0.95,
              sum(rate(gotk_reconcile_duration_seconds_bucket{kind=~"GitRepository|HelmRepository|OCIRepository|Bucket"}[10m]))
              by (le, kind, name, namespace)
            ) > 60
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Flux source fetch is slow: {{ $labels.kind }}/{{ $labels.name }}"
            description: >
              P95 fetch latency for {{ $labels.kind }} {{ $labels.namespace }}/{{ $labels.name }}
              is {{ $value | humanizeDuration }}. Investigate network issues
              or repository size.

        # Alert when source reconciliation is timing out
        - alert: FluxSourceReconciliationTimeout
          expr: |
            histogram_quantile(0.99,
              sum(rate(gotk_reconcile_duration_seconds_bucket{kind=~"GitRepository|HelmRepository"}[10m]))
              by (le, kind, name, namespace)
            ) > 300
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Flux source reconciliation near timeout: {{ $labels.kind }}/{{ $labels.name }}"
            description: >
              P99 reconciliation duration exceeds 5 minutes for
              {{ $labels.kind }} {{ $labels.namespace }}/{{ $labels.name }}.
```

Apply:

```bash
# Apply source latency alerting rules
kubectl apply -f flux-source-latency-alerts.yaml
```

## Step 5: Investigate Slow Sources

When latency alerts fire, use the Flux CLI to inspect specific sources:

```bash
# Check the status of all Git repositories
flux get sources git --all-namespaces

# Check a specific source for detailed status
flux get source git <source-name> -n <namespace>

# View recent events for the source-controller
flux events --for GitRepository/<source-name> -n <namespace>
```

Common causes of high source fetch latency include:

1. **Large repositories** -- Use shallow clones by setting `spec.ref.branch` and consider using sparse checkout or ignoring paths.
2. **Rate limiting** -- GitHub and other providers impose API rate limits. Use deploy tokens or SSH keys for authentication.
3. **Network issues** -- Check DNS resolution and egress network policies in your cluster.
4. **Large Helm index files** -- Switch to OCI-based Helm repositories where possible.

## Step 6: Optimize Source Fetch Performance

Reduce latency by configuring your sources appropriately:

```yaml
# optimized-git-source.yaml - Reduce Git fetch latency
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/my-app
  ref:
    branch: main
  ignore: |
    # Exclude non-essential directories from checkout
    /docs/
    /tests/
    /*.md
```

## Summary

Monitoring Flux CD source fetch latency centers on the `gotk_reconcile_duration_seconds` histogram metric for source-type resources. By tracking P50, P95, and P99 latency percentiles, setting alerts for slow fetches, and investigating root causes with the Flux CLI, you can keep your deployment pipeline responsive. Use OneUptime to aggregate these latency metrics across all your clusters and correlate source fetch slowdowns with deployment delays for a complete picture of your GitOps delivery performance.
