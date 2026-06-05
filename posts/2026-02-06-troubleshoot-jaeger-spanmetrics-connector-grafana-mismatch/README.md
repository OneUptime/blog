# How to Troubleshoot the Jaeger spanmetrics Processor vs Connector Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Jaeger, Spanmetrics, Grafana

Description: Fix Grafana dashboard issues caused by metric name and format differences between the spanmetrics processor and connector.

You migrate from the deprecated `spanmetrics` processor to the `span_metrics` connector in the OpenTelemetry Collector. After the migration, your Grafana dashboards break. Panels show "No data" even though metrics are flowing. The issue is that the connector produces metrics with different names and formats than the processor.

## What Changed Between Processor and Connector

The `spanmetrics` processor (deprecated) and the `span_metrics` connector (current) generate metrics with different naming conventions when exported with Prometheus' default OpenTelemetry translation:

| Processor (old) | Connector (new) |
|-----------------|-----------------|
| `calls_total` | `traces_span_metrics_calls_total` |
| `latency_bucket` | `traces_span_metrics_duration_milliseconds_bucket` |
| `latency_count` | `traces_span_metrics_duration_milliseconds_count` |
| `latency_sum` | `traces_span_metrics_duration_milliseconds_sum` |

The connector also uses different dimension names. Prometheus normally normalizes dotted OpenTelemetry attribute names to underscores:

| Processor Label | Connector Dimension | Prometheus Label |
|----------------|---------------------|------------------|
| `service_name` | `service.name` | `service_name` |
| `operation` | `span.name` | `span_name` |
| `span_kind` | `span.kind` | `span_kind` |
| `status_code` | `status.code` | `status_code` |

## Diagnosing the Mismatch

### Step 1: Check What Metrics the Connector Produces

Query the Collector's Prometheus endpoint or your metrics backend:

```bash
# If using the prometheus exporter

curl -s http://collector:8889/metrics | grep -E "traces_span_metrics|calls_total|duration_milliseconds"
```

Look at the actual metric names and labels being produced.

### Step 2: Check Your Grafana Queries

Open your broken Grafana panels and look at the PromQL queries:

```text
# Old query (processor format)
sum(rate(calls_total{service_name="my-service"}[5m])) by (operation, status_code)

# New query (connector format)
sum(rate(traces_span_metrics_calls_total{service_name="my-service"}[5m])) by (span_name, status_code)
```

## Fix 1: Update Grafana Dashboard Queries

Update all PromQL queries to use the new metric and label names:

```text
# Old: request rate
sum(rate(calls_total{service_name="$service"}[5m])) by (operation, status_code)

# New: request rate
sum(rate(traces_span_metrics_calls_total{service_name="$service"}[5m])) by (span_name, status_code)
```

```text
# Old: latency percentiles
histogram_quantile(0.99, sum(rate(latency_bucket{service_name="$service"}[5m])) by (le, operation))

# New: latency percentiles
histogram_quantile(0.99, sum(rate(traces_span_metrics_duration_milliseconds_bucket{service_name="$service"}[5m])) by (le, span_name))
```

## Fix 2: Use the Connector's namespace Option

The connector supports a `namespace` option that changes the metric name prefix:

```yaml
connectors:
  span_metrics:
    namespace: ""  # removes the prefix entirely
    dimensions:
    - name: http.method
    - name: http.status_code
```

With `namespace: ""`, the Prometheus-normalized metrics are named:
- `calls_total` (same as the old processor)
- `duration_milliseconds_bucket`

Note: `duration_milliseconds` is still different from `latency`. You will need to update latency-related queries regardless.

## Fix 3: Use Recording Rules in Prometheus

If you cannot change the Collector config or Grafana dashboards immediately, use Prometheus recording rules to create aliases:

```yaml
# prometheus-rules.yml
groups:
- name: spanmetrics-compat
  rules:
  # Create an alias for the old metric name
  - record: calls_total
    expr: label_replace(traces_span_metrics_calls_total, "operation", "$1", "span_name", "(.+)")

  - record: latency_bucket
    expr: label_replace(traces_span_metrics_duration_milliseconds_bucket, "operation", "$1", "span_name", "(.+)")

  - record: latency_count
    expr: label_replace(traces_span_metrics_duration_milliseconds_count, "operation", "$1", "span_name", "(.+)")

  - record: latency_sum
    expr: label_replace(traces_span_metrics_duration_milliseconds_sum, "operation", "$1", "span_name", "(.+)")
```

This creates both old and new metric names in Prometheus, so old and new dashboards work simultaneously during migration.

## Fix 4: Configure Connector Dimensions Explicitly

The connector uses different default dimension names. Configure any extra dimensions explicitly:

```yaml
connectors:
  span_metrics:
    namespace: ""
    dimensions:
    - name: http.method
    - name: http.status_code
    - name: http.route
    # The following are included by default:
    # service.name, span.name, span.kind, status.code
    aggregation_cardinality_limit: 1000
    aggregation_temporality: AGGREGATION_TEMPORALITY_CUMULATIVE
    metrics_flush_interval: 30s
```

## Fix 5: Use the Transform Processor for Label Mapping

If your metrics backend preserves dotted OpenTelemetry attribute names and your dashboards expect processor labels, use the transform processor after the connector to add compatibility labels:

```yaml
processors:
  transform/spanmetrics-compat:
    metric_statements:
    - context: datapoint
      statements:
      # Add processor-style labels for dashboard compatibility
      - set(attributes["service_name"], attributes["service.name"])
        where attributes["service.name"] != nil
      - set(attributes["operation"], attributes["span.name"])
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

```text
# Verify the new metric exists
traces_span_metrics_calls_total

# Check available labels
traces_span_metrics_calls_total{service_name=~".+"}

# Compare old and new results
sum by (service_name) (calls_total{service_name="my-service"})
sum by (service_name) (traces_span_metrics_calls_total{service_name="my-service"})
```

The migration from spanmetrics processor to connector is a necessary upgrade since the processor is deprecated. Plan for metric name and label changes, and use recording rules as a bridge during the transition.
