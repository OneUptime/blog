# How to Troubleshoot Data Mismatch Between Tempo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana Tempo, Prometheus, Collector Pipeline

Description: Fix data inconsistencies between Tempo and Prometheus caused by incorrect pipeline forking in the OpenTelemetry Collector.

You use the OpenTelemetry Collector to send traces to Tempo and derived metrics (via spanmetrics) to Prometheus. But the numbers do not match. Tempo shows 1000 spans for a service, but the `calls_total` metric in Prometheus says 800. Or Prometheus has metrics for spans that are not in Tempo. The data is inconsistent because the pipeline fork is configured incorrectly.

## How Pipeline Forking Works

When the Collector forks data to multiple destinations, the fork point matters. If you process data before forking, both destinations get the same data. If you process data differently in each branch, the results diverge.

## The Broken Configuration

```yaml
connectors:
  span_metrics:
    dimensions:
    - name: http.method

processors:
  filter/errors-only:
    error_mode: ignore
    trace_conditions:
    - 'span.status.code != STATUS_CODE_ERROR'

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/errors-only, batch]  # filters out non-error spans
      exporters: [otlp/tempo, span_metrics]    # spanmetrics sees filtered data

    metrics:
      receivers: [span_metrics]
      processors: [batch]
      exporters: [prometheus_remote_write]
```

The problem: the `filter/errors-only` processor drops non-error spans before the `spanmetrics` connector sees them. So spanmetrics only counts error spans, not all spans. The resulting metrics only reflect errors, not total traffic.

## The Fix: Fork Before Filtering

Use separate pipelines to process data differently for each destination:

```yaml
connectors:
  span_metrics:
    dimensions:
    - name: http.method
    - name: http.status_code

processors:
  filter/errors-only:
    error_mode: ignore
    trace_conditions:
    - 'span.status.code != STATUS_CODE_ERROR'

service:
  pipelines:
    # Pipeline 1: All traces go to spanmetrics (no filtering)
    traces/metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [span_metrics]

    # Pipeline 2: Only error spans go to Tempo
    traces/storage:
      receivers: [otlp]
      processors: [filter/errors-only, batch]
      exporters: [otlp/tempo]

    # Pipeline 3: Derived metrics go to Prometheus
    metrics:
      receivers: [span_metrics]
      processors: [batch]
      exporters: [prometheus_remote_write]
```

Now `spanmetrics` sees all spans (unfiltered), while Tempo only receives error spans. The metrics in Prometheus accurately reflect total traffic, even though Tempo is intentionally storing a reduced trace set.

## Common Forking Mistakes

### Mistake 1: Sampling Applied Before Forking

```yaml
# WRONG: tail sampling reduces data before spanmetrics sees it

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp/tempo, span_metrics]  # spanmetrics sees sampled data
```

If you sample 10% of traces, spanmetrics will report 10% of the actual call count. Fix: fork before sampling.

```yaml
# CORRECT: fork before sampling
service:
  pipelines:
    traces/all:
      receivers: [otlp]
      processors: [batch]
      exporters: [span_metrics]          # sees all data

    traces/sampled:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp/tempo]            # sees sampled data

    metrics:
      receivers: [span_metrics]
      processors: [batch]
      exporters: [prometheus_remote_write]
```

### Mistake 2: Different Attribute Processors on Each Branch

```yaml
# PROBLEM: attribute changes are inconsistent
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/normalize, batch]
      exporters: [otlp/tempo, span_metrics]
```

If `attributes/normalize` changes span names or attributes, spanmetrics will group metrics based on the normalized values. Make sure the normalization matches what you expect in both Tempo and Prometheus.

### Mistake 3: Batch Processor Causing Inconsistencies

The batch processor can cause subtle timing differences. If traces/storage has a longer batch timeout than traces/metrics, metrics might appear before the corresponding spans:

```yaml
processors:
  batch/fast:
    timeout: 2s
  batch/slow:
    timeout: 30s

service:
  pipelines:
    traces/metrics:
      processors: [batch/fast]
      exporters: [span_metrics]

    traces/storage:
      processors: [batch/slow]
      exporters: [otlp/tempo]
```

This is usually fine, but it can confuse dashboards that compare metric counts with span counts in real-time.

## Verifying Data Consistency

Write a query that compares span counts in Tempo with metric counts in Prometheus:

```text
# Prometheus: total calls for a service in the last hour
sum(increase(traces_span_metrics_calls_total{service_name="my-service"}[1h]))

# Tempo: count matching spans for the same service in the last hour
# (via Tempo API or TraceQL metrics)
{ resource.service.name = "my-service" } | count_over_time()
```

If you are not filtering or sampling, these numbers should be approximately equal (allowing for slight timing differences).

## Debugging with the Debug Exporter

Add debug exporters to both branches to compare:

```yaml
service:
  pipelines:
    traces/metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [span_metrics, debug/pre-filter]

    traces/storage:
      receivers: [otlp]
      processors: [filter/errors-only, batch]
      exporters: [otlp/tempo, debug/post-filter]
```

Compare the debug output from both exporters. The pre-filter output should have more spans than the post-filter output, and the spanmetrics numbers should match the pre-filter counts.

## Summary

Data mismatches between Tempo and Prometheus happen when the pipeline fork point is after filtering or sampling. The spanmetrics connector (or any connector) should see the full unfiltered data when it needs to produce metrics for all spans. Create separate pipelines that fork before any data reduction, and verify consistency by comparing metric counts with span counts.
