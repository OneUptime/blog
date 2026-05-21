# How to Manage Short-Lived Metrics in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metric, Prometheus, Kubernetes, Staleness

Description: Handle short-lived metrics from ephemeral pods, canary deployments, and autoscaled services in Istio to avoid stale data and broken dashboards.

---

Short-lived metrics are a sneaky problem in Istio monitoring. When pods come and go frequently - think autoscaling events, rolling deployments, canary releases, cron jobs, or spot instances - the metrics they generate become stale quickly. Prometheus marks time series as stale when a target disappears, and range queries can still include historical samples after the series has disappeared from instant queries. This leads to confusing dashboards, phantom services in topology views, and alerts that fire on services that no longer exist.

## The Problem with Ephemeral Workloads

In Kubernetes, pods are ephemeral by nature. But metrics are typically designed for long-running processes. Here's what happens:

1. A pod starts, gets a sidecar, and starts generating Istio metrics
2. The pod runs for a short time (minutes to hours)
3. The pod is terminated (autoscale down, deployment, job completion)
4. Prometheus has metrics for that pod, but no new data is coming in
5. Prometheus marks the series stale soon after the target disappears
6. After staleness, the series disappears from instant queries but historical samples remain available to range queries

For services that scale up and down frequently, this creates a messy picture. You might see 50 pods worth of metrics when only 10 pods are actually running.

## Types of Short-Lived Metrics in Istio

### Rolling Deployments

During a rolling update, old pods are terminated and new ones start with fresh metric counters. The old pod's metrics go stale while the new pod's metrics start from zero. This creates gaps and discontinuities in your graphs.

### Autoscaled Services (HPA)

When a Horizontal Pod Autoscaler scales down from 20 pods to 5, the metrics from the terminated 15 pods go stale. Rate calculations can produce unexpected results during the scale-down period.

### Canary Deployments

Canary pods run briefly and are then either promoted or removed. Their metrics need to be tracked separately from the main deployment but also cleaned up when the canary is gone.

### CronJobs and Batch Jobs

Jobs that run periodically create metrics that are only valid during execution. Between runs, there's nothing to scrape.

## Handling Stale Metrics in Queries

The most immediate fix is writing PromQL queries that handle staleness gracefully.

### Use Rate Functions Correctly

The `rate()` function handles counter resets (from pod restarts) automatically. But it needs at least two data points, so very short-lived pods might not have enough data for rate calculations:

```promql
# This works for pods that live at least 2 scrape intervals

sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="my-service"
}[5m])) by (destination_workload)
```

The `[5m]` window should be at least 4x your scrape interval. For 30-second scrape intervals, a 5-minute window is fine.

### Filter Out Stale Series

Use Kubernetes pod state metrics to filter only currently running pods. This example assumes your Istio metrics and kube-state-metrics both expose compatible `namespace` and `pod` labels:

```promql
# Only count metrics from currently running pods
sum by (destination_workload) (
  rate(istio_requests_total{
    reporter="destination",
    destination_workload="my-service"
  }[5m])
  and on (namespace, pod)
  (kube_pod_status_phase{phase="Running"} == 1)
)
```

### Using `absent()` for Short-Lived Services

Detect when a service has stopped reporting:

```promql
absent(rate(istio_requests_total{
  reporter="destination",
  destination_workload="canary-service"
}[10m]))
```

This returns 1 when no data has been received for the canary service in the last 10 minutes.

## Prometheus Configuration for Short-Lived Pods

### Reducing Scrape Interval

For short-lived workloads, you might want a shorter scrape interval to capture more data points:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: short-lived-envoy
  namespace: monitoring
spec:
  selector:
    matchLabels:
      job-type: batch
  podMetricsEndpoints:
    - path: /stats/prometheus
      port: http-envoy-prom
      interval: 15s
```

Be careful - shorter intervals mean more load on Prometheus.

### Pushgateway for Job Metrics

For very short-lived service-level jobs (less than a minute), metrics might not get scraped at all. Use the Pushgateway carefully for final job outcome metrics, and avoid per-pod or per-instance labels that would leave stale series behind:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
        - name: migration
          image: migration-tool:latest
          command: ["/bin/sh", "-c"]
          args:
            - |
              # Run the migration
              ./run-migration.sh
              # Push a final service-level success metric before exit
              printf 'data_migration_last_success_unixtime %s\n' "$(date +%s)" | \
                curl --data-binary @- http://pushgateway.monitoring:9091/metrics/job/data-migration
      restartPolicy: Never
```

### Configuring Sidecar Lifecycle for Jobs

A common issue with Istio sidecar in Jobs is that the sidecar doesn't terminate when the main container finishes. Configure proper lifecycle handling:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: short-job
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
        - name: worker
          image: worker:latest
          command: ["/bin/sh", "-c"]
          args:
            - |
              ./do-work.sh
              # Signal the sidecar to quit
              curl -X POST http://localhost:15020/quitquitquit
      restartPolicy: Never
```

The `/quitquitquit` endpoint tells the Istio proxy to shut down, which lets the Job complete instead of waiting on the sidecar. It does not replace scraping or pushing any final metrics you need to keep.

## Handling Canary Metrics

For canary deployments, track metrics separately using workload labels:

```promql
# Canary traffic
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="my-service",
  destination_workload_namespace="production"
}[5m])) by (destination_workload)

# You can also use pod_name label if available
```

If your canary uses a separate workload name (like `my-service-canary`), the metrics naturally separate. When the canary is removed, its metrics go stale and eventually disappear.

## Recording Rules for Ephemeral Workloads

Recording rules evaluate continuously, so they naturally handle the transition when pods appear and disappear:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ephemeral-workload-rules
  namespace: monitoring
spec:
  groups:
    - name: ephemeral-metrics
      interval: 30s
      rules:
        # This recording rule continuously updates
        # even as pods come and go
        - record: istio:service:request_rate_5m
          expr: |
            sum(rate(istio_requests_total{
              reporter="destination"
            }[5m])) by (destination_workload, destination_workload_namespace)

        # Track how many pods are reporting metrics
        - record: istio:service:reporting_pods
          expr: |
            count by (destination_workload, destination_workload_namespace)(
              rate(istio_requests_total{reporter="destination"}[5m]) > 0
            )
```

## Alerting That Accounts for Ephemeral Pods

Your alerts need to tolerate pod churn. Avoid alerts that trigger just because pods are scaling:

```yaml
# Bad: Alerts when any pod stops reporting (triggers during scale-down)
- alert: ServiceDown
  expr: absent(istio_requests_total{destination_workload="my-service"})

# Better: Alerts when the aggregate rate drops to zero
- alert: ServiceDown
  expr: |
    (sum(rate(istio_requests_total{
      reporter="destination",
      destination_workload="my-service"
    }[5m])) or vector(0)) == 0
    and
    sum(rate(istio_requests_total{
      reporter="destination",
      destination_workload="my-service"
    }[5m] offset 30m)) > 0
  for: 10m
```

The improved version checks that the service was previously active (ruling out services that are intentionally off) and uses a longer evaluation window.

## Cleaning Up Stale Metrics

### Prometheus Staleness Handling

Prometheus marks series stale when a scrape no longer returns them or when the target disappears. For metrics with explicit timestamps, Prometheus can keep using the most recent sample for the default 5-minute lookback period before the series disappears. You can account for scrape gaps in queries by using slightly longer range vectors:

```promql
# Use a range that exceeds the staleness period
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="my-service"
}[10m]))
```

### TSDB Tombstone Cleanup

For truly stale series that you want gone from Prometheus storage, you can use the admin API if Prometheus was started with `--web.enable-admin-api`:

```bash
# Delete series for a removed service
curl -X POST -g 'http://prometheus:9090/api/v1/admin/tsdb/delete_series?match[]=istio_requests_total{destination_workload="removed-service"}'

# Trigger compaction
curl -X POST 'http://prometheus:9090/api/v1/admin/tsdb/clean_tombstones'
```

Only do this for services that are permanently removed, not for temporarily scaled-down services.

## Best Practices Summary

1. Use `sum()` aggregations by workload name rather than per-pod queries
2. Write alerts that check aggregate rates, not individual pod presence
3. Configure sidecar lifecycle properly for Jobs (use `quitquitquit`)
4. Use recording rules to smooth out churn in your dashboards
5. Consider Pushgateway for very short-lived workloads
6. Set your PromQL range windows wide enough to handle scrape gaps during pod transitions

Short-lived metrics are an inherent challenge in dynamic container environments. The key is designing your queries, alerts, and dashboards to work with aggregated workload-level data rather than individual pod-level data. This way, pods can come and go without breaking your observability.
