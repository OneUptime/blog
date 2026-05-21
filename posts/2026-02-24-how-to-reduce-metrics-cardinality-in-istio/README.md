# How to Reduce Metrics Cardinality in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metric, Cardinality, Prometheus, Performance

Description: Reduce Istio metrics cardinality to lower Prometheus storage costs and improve query performance by removing labels, disabling metrics, and using recording rules.

---

Metrics cardinality is the total number of unique time series in your monitoring system. In an Istio mesh, cardinality can grow fast. Each combination of source workload, destination workload, response code, and other labels creates a separate time series. A mesh with 100 services can easily generate hundreds of thousands of time series just from the standard Istio metrics. If you don't manage cardinality, your Prometheus instance will eat memory, queries will slow down, and your monitoring costs will climb.

## Understanding the Cardinality Problem

Each Istio metric has multiple labels. The number of time series for a single metric equals the product of all unique values across all labels. For `istio_requests_total`:

- `reporter`: 2 values (source, destination)
- `source_workload`: N services
- `destination_workload`: N services
- `response_code`: ~10 common codes
- `connection_security_policy`: 2 values
- `request_protocol`: ~3 values
- `response_flags`: ~10 values
- `source_principal`: N service accounts
- `destination_principal`: N service accounts
- `grpc_response_status`: ~5 values

For a mesh with 50 services, that's potentially 2 x 50 x 50 x 10 x 2 x 3 x 10 x 50 x 50 x 5 = 375 billion possible combinations. In practice, most combinations don't occur, so the real number is much lower. But even a fraction of this is way too much.

## Quick Wins: Check Your Current Cardinality

Before optimizing, measure what you have:

```promql
# Total active time series from Istio

count({__name__=~"istio_.*"})

# Time series per metric
count by (__name__)({__name__=~"istio_.*"})

# Cardinality by label on istio_requests_total
count(istio_requests_total) by (response_code)
count(istio_requests_total) by (source_workload)
count(istio_requests_total) by (destination_workload)
```

These queries show you where the cardinality is concentrated.

## Strategy 1: Remove High-Cardinality Labels

The biggest win comes from removing labels you don't use. The `source_principal` and `destination_principal` labels have one unique value per service account and are rarely used in queries:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-cardinality
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT_AND_SERVER
          tagOverrides:
            source_principal:
              operation: REMOVE
            destination_principal:
              operation: REMOVE
```

Other labels to consider removing:

```yaml
tagOverrides:
  source_principal:
    operation: REMOVE
  destination_principal:
    operation: REMOVE
  grpc_response_status:
    operation: REMOVE
  request_protocol:
    operation: REMOVE
  connection_security_policy:
    operation: REMOVE
```

Each label you remove collapses multiple time series into fewer ones. Removing `source_principal` and `destination_principal` alone can cut cardinality by a huge factor in large meshes.

## Strategy 2: Disable Client-Side Reporting

Every request is reported twice - once by the source proxy and once by the destination proxy. If you only need the server perspective, disable client-side reporting:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: server-side-only
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT
          disabled: true
```

This cuts your Istio metric volume roughly in half. The trade-off is losing the client's perspective on errors and latency. In most cases, server-side metrics are sufficient.

## Strategy 3: Disable Unnecessary Metrics

If you don't need request/response size metrics, disable them entirely:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-size-metrics
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_SIZE
            mode: CLIENT_AND_SERVER
          disabled: true
        - match:
            metric: RESPONSE_SIZE
            mode: CLIENT_AND_SERVER
          disabled: true
```

Histograms like `istio_request_bytes` are especially expensive because they create one time series per bucket, plus `_sum` and `_count` series. Disabling two histograms removes all of those series for each unique label combination.

## Strategy 4: Disable Metrics for Specific Workloads

Some workloads generate lots of metrics but don't need monitoring at the Istio level. Internal utilities, health checkers, or batch jobs can be excluded:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-metrics-batch
  namespace: production
spec:
  selector:
    matchLabels:
      app: batch-processor
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT_AND_SERVER
          disabled: true
```

## Strategy 5: Filter at the Prometheus Level

Even after reducing what Istio generates, you can further filter in Prometheus using metric relabeling:

```yaml
# In your PodMonitor or ServiceMonitor
metricRelabelings:
  # Drop Envoy-native metrics if you do not use them
  - sourceLabels: [__name__]
    regex: "envoy_.*"
    action: drop

  # Drop response codes you do not need to store
  - sourceLabels: [__name__, response_code]
    regex: "istio_requests_total;(0|1..|3..)"
    action: drop
```

Metric relabeling drops samples before ingestion. It does not aggregate values, so use recording rules if you want rolled-up series such as `2xx`, `3xx`, or `5xx`.

## Strategy 6: Use Recording Rules

Replace expensive PromQL queries with pre-computed recording rules. This doesn't reduce stored cardinality, but it reduces query-time load:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-recording-rules
  namespace: monitoring
spec:
  groups:
    - name: istio-aggregations
      interval: 30s
      rules:
        - record: istio:service:request_rate_5m
          expr: |
            sum(rate(istio_requests_total{reporter="destination"}[5m]))
            by (destination_workload, destination_workload_namespace)

        - record: istio:service:error_rate_5m
          expr: |
            sum(rate(istio_requests_total{reporter="destination",response_code=~"5.."}[5m]))
            by (destination_workload, destination_workload_namespace)
            /
            sum(rate(istio_requests_total{reporter="destination"}[5m]))
            by (destination_workload, destination_workload_namespace)

        - record: istio:service:latency_p99_5m
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
              by (destination_workload, destination_workload_namespace, le)
            )
```

Then point your dashboards and alerts at the recording rules instead of raw metrics. This is way faster and puts less load on Prometheus.

## Strategy 7: Reduce Histogram Bucket Count

Histograms with many buckets create the most time series. If the default duration buckets are more granular than you need, you can't reduce them through the Telemetry API directly, but you can drop buckets in Prometheus:

```yaml
metricRelabelings:
  # Drop some histogram buckets to reduce cardinality
  - sourceLabels: [__name__, le]
    regex: "istio_request_duration_milliseconds_bucket;(0\\.5|1|5|2500|5000|30000|60000|300000|600000)"
    action: drop
```

This drops selected very small and very large duration buckets while preserving the bucket series that are usually most useful for service latency dashboards. Adjust the list for your SLOs before applying it.

## Strategy 8: Shorten Retention

If you don't need months of high-resolution Istio data, reduce your Prometheus retention:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
spec:
  retention: 7d
  retentionSize: 50GB
```

For long-term storage, use Thanos or Cortex with downsampling rules to keep aggregated data longer at lower cardinality.

## Measuring the Impact

After applying changes, verify the reduction:

```promql
# Before vs after: total Istio time series
count({__name__=~"istio_.*"})
```

Monitor your Prometheus resource usage:

```promql
# Prometheus memory usage
process_resident_memory_bytes{job="prometheus"}

# Ingestion rate (samples per second)
rate(prometheus_tsdb_head_samples_appended_total[5m])

# Active time series
prometheus_tsdb_head_series
```

## A Practical Reduction Plan

Here's a phased approach that works for most teams:

1. **Phase 1** - Remove `source_principal` and `destination_principal` labels (saves ~50-70% cardinality)
2. **Phase 2** - Disable `REQUEST_SIZE` and `RESPONSE_SIZE` metrics (saves ~20-30% more)
3. **Phase 3** - Disable client-side reporting (saves ~50% of remaining)
4. **Phase 4** - Add recording rules and point dashboards at them
5. **Phase 5** - Drop unnecessary histogram buckets and Envoy-native metrics

After all phases, most teams see a 70-90% reduction in Istio-related time series. The key is making sure you don't remove labels or metrics that your alerts and dashboards depend on. Review your queries before each phase, update them as needed, then apply the reduction.

Managing Istio metrics cardinality is an ongoing process. As your mesh grows, you'll need to revisit your settings. Build a habit of checking cardinality quarterly and trimming anything that's grown beyond what you actually use.
