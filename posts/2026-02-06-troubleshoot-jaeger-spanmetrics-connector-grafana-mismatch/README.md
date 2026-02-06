# How to Troubleshoot the Jaeger spanmetrics Processor vs Connector Format Mismatch with Grafana Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Jaeger, Spanmetrics, Grafana

Description: Fix Grafana dashboard issues caused by metric name and format differences between the spanmetrics processor and connector.

You migrate from the deprecated `spanmetrics` processor to the `spanmetrics` connector in the OpenTelemetry Collector. After the migration, your Grafana dashboards break. Panels show "No data" even though metrics are flowing. The issue is that the connector produces metrics with different names and formats than the processor.

## What Changed Between Processor and Connector

The `spanmetrics` processor (deprecated) and the `spanmetrics` connector (current) generate metrics with different naming conventions:

| Processor (old) | Connector (new) |
|-----------------|-----------------|
| `calls_total` | `traces_spanmetrics_calls_total` |
| `latency_bucket` | `traces_spanmetrics_duration_milliseconds_bucket` |
| `latency_count` | `traces_spanmetrics_duration_milliseconds_count` |
| `latency_sum` | `traces_spanmetrics_duration_milliseconds_sum` |

The connector also uses different label names:

| Processor Label | Connector Label |
|----------------|-----------------|
| `service_name` | `service.name` (with dot) |
| `span_name` | `span.name` |
| `span_kind` | `span.kind` |
| `status_code` | `status.code` |

## Diagnosing the Mismatch

### Step 1: Check What Metrics the Connector Produces

Query the Collector's Prometheus endpoint or your metrics backend:

```bash
# If using the prometheus exporter
curl -s http://collector:8889/metrics | grep "spanmetrics"
```

Look at the actual metric names and labels being produced.

### Step 2: Check Your Grafana Queries

Open your broken Grafana panels and look at the PromQL queries:

```
# Old query (processor format)
sum(rate(calls_total{service_name="my-service"}[5m])) by (span_name, status_code)

# New query (connector format)
sum(rate(traces_spanmetrics_calls_total{service_name="my-service"}[5m])) by (span_name, status_code)
```

## Fix 1: Update Grafana Dashboard Queries

Update all PromQL queries to use the new metric and label names:

```
# Old: request rate
sum(rate(calls_total{service_name="$service"}[5m])) by (span_name, status_code)

# New: request rate
sum(rate(traces_spanmetrics_calls_total{service_name="$service"}[5m])) by (span_name, status_code)
```

```
# Old: latency percentiles
histogram_quantile(0.99, sum(rate(latency_bucket{service_name="$service"}[5m])) by (le, span_name))

# New: latency percentiles
histogram_quantile(0.99, sum(rate(traces_spanmetrics_duration_milliseconds_bucket{service_name="$service"}[5m])) by (le, span_name))
```

## Fix 2: Use the Connector's namespace Option

The connector supports a `namespace` option that changes the metric name prefix:

```yaml
connectors:
  spanmetrics:
    namespace: ""  # removes the prefix entirely
    dimensions:
    - name: http.method
    - name: http.status_code
```

With `namespace: ""`, the metrics are named:
- `calls_total` (same as the old processor)
- `duration_milliseconds_bucket`

Note: `duration_milliseconds` is still different from `latency`. You will need to update latency-related queries regardless.

## Fix 3: Use Metric Relabeling in Prometheus

If you cannot change the Collector config or Grafana dashboards immediately, use Prometheus recording rules to create aliases:

```yaml
# prometheus-rules.yml
groups:
- name: spanmetrics-compat
  rules:
  # Create an alias for the old metric name
  - record: calls_total
    expr: traces_spanmetrics_calls_total

  - record: latency_bucket
    expr: traces_spanmetrics_duration_milliseconds_bucket

  - record: latency_count
    expr: traces_spanmetrics_duration_milliseconds_count

  - record: latency_sum
    expr: traces_spanmetrics_duration_milliseconds_sum
```

This creates both old and new metric names in Prometheus, so old and new dashboards work simultaneously during migration.

## Fix 4: Configure Connector Dimensions to Match Old Labels

The connector uses different default dimension names. Configure them explicitly to match:

```yaml
connectors:
  spanmetrics:
    namespace: ""
    dimensions:
    - name: http.method
    - name: http.status_code
    - name: http.route
    # The following are included by default:
    # service.name, span.name, span.kind, status.code
    dimensions_cache_size: 1000
    aggregation_temporality: AGGREGATION_TEMPORALITY_CUMULATIVE
    metrics_flush_interval: 30s
```

## Fix 5: Use the Transform Processor for Label Mapping

If labels changed format (dots vs underscores), use the transform processor to normalize:

```yaml
processors:
  transform/spanmetrics-compat:
    metric_statements:
    - context: datapoint
      statements:
      # Map dotted labels to underscored labels for dashboard compatibility
      - set(attributes["service_name"], attributes["service.name"])
        where attributes["service.name"] != nil
      - set(attributes["span_name"], attributes["span.name"])
        where attributes["span.name"] != nil
```

## Migration Checklist

1. Deploy the connector alongside the processor temporarily
2. Verify the connector produces metrics
3. Update Grafana dashboard queries one panel at a time
4. Use recording rules as a compatibility bridge during migration
5. Remove the processor once all dashboards are updated
6. Remove recording rules after confirming everything works

## Testing Dashboard Queries

Before deploying dashboard changes, test queries in Grafana Explore:

```
# Verify the new metric exists
traces_spanmetrics_calls_total

# Check available labels
traces_spanmetrics_calls_total{service_name=~".+"}

# Compare old and new results
calls_total{service_name="my-service"} == traces_spanmetrics_calls_total{service_name="my-service"}
```

The migration from spanmetrics processor to connector is a necessary upgrade since the processor is deprecated. Plan for metric name and label changes, and use recording rules as a bridge during the transition.
