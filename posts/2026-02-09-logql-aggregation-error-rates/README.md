# How to Write LogQL Aggregation Queries to Count Kubernetes Error Rates per Microservice

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Loki, Kubernetes, Logging

Description: Master LogQL aggregation queries to calculate error rates across Kubernetes microservices, enabling data-driven insights into application health and service reliability metrics from logs.

---

Logs contain valuable signals about application health, but raw log browsing doesn't scale. LogQL aggregation transforms logs into metrics, letting you count error rates, calculate percentages, and track trends across your Kubernetes microservices. This guide teaches you how to write sophisticated LogQL queries that extract meaningful error rate metrics from your log streams.

## Understanding LogQL Aggregation

LogQL has two query types:

- **Log queries** - Return log lines matching filters
- **Metric queries** - Aggregate log data into time-series metrics

For error rate analysis, you'll use metric queries with aggregation functions like `rate()`, `count_over_time()`, and `sum()`.

## Basic Error Counting

Start with simple error counting across all logs:

```logql
# Count error logs per second
rate({namespace="production"} |= "error" [5m])

# Count specific error levels
sum(rate({namespace="production"} | json | level="error" [5m]))

# Count errors by service
sum by (service) (
  rate({namespace="production"} | json | level="error" [5m])
)
```

These queries give you basic error rates, but real microservice architectures need more sophisticated analysis.

## Calculating Error Rates per Microservice

Track error rates for each microservice separately:

```logql
# Error rate per microservice (errors per second)
sum by (app) (
  rate({namespace="production"} | json | level="error" [5m])
)

# Error rate with namespace context
sum by (namespace, app) (
  rate({namespace=~"production|staging"} | json | level="error" [5m])
)

# Error rate by deployment
sum by (deployment) (
  rate(
    {namespace="production"}
    | json
    | level="error"
    [5m]
  )
)
```

## Computing Error Percentages

Calculate what percentage of logs are errors:

```logql
# Error percentage per service
(
  sum by (app) (
    rate({namespace="production"} | json | level="error" [5m])
  )
  /
  sum by (app) (
    rate({namespace="production"} | json [5m])
  )
) * 100

# Error percentage with multiple severity levels
(
  sum by (app) (
    rate(
      {namespace="production"}
      | json
      | level=~"error|fatal|critical"
      [5m]
    )
  )
  /
  sum by (app) (
    rate({namespace="production"} | json [5m])
  )
) * 100
```

## Filtering by Error Type

Count specific error categories:

```logql
# Count database errors
sum by (app) (
  rate(
    {namespace="production"}
    | json
    | level="error"
    | message =~ "database|sql|query"
    [5m]
  )
)

# Count HTTP 5xx errors
sum by (app, status_code) (
  rate(
    {namespace="production"}
    | json
    | status_code >= 500
    [5m]
  )
)

# Count timeout errors
sum by (app) (
  rate(
    {namespace="production"}
    | json
    | level="error"
    | message =~ "timeout|timed out"
    [5m]
  )
)

# Count specific exceptions
sum by (app, exception_type) (
  rate(
    {namespace="production"}
    | json
    | level="error"
    | exception_type != ""
    [5m]
  )
)
```

## Multi-Dimensional Error Analysis

Break down errors by multiple dimensions:

```logql
# Errors by service and endpoint
sum by (app, endpoint) (
  rate(
    {namespace="production"}
    | json
    | level="error"
    | endpoint != ""
    [5m]
  )
)

# Errors by service, pod, and error type
sum by (app, pod, error_type) (
  rate(
    {namespace="production"}
    | json
    | level="error"
    | error_type != ""
    [5m]
  )
)

# Errors by namespace, service, and HTTP status
sum by (namespace, app, status_code) (
  rate(
    {namespace=~".*"}
    | json
    | status_code >= 400
    [5m]
  )
)
```

## Using Pattern Parsing for Unstructured Logs

Extract metrics from unstructured log formats:

```logql
# Parse nginx access logs for errors
sum by (app) (
  rate(
    {app="nginx"}
    | pattern `<_> <_> <_> [<_>] "<method> <path> <_>" <status> <_>`
    | status >= 500
    [5m]
  )
)

# Parse custom log format
sum by (service) (
  rate(
    {namespace="production"}
    | pattern `<timestamp> <level> <service> <message>`
    | level = "ERROR"
    [5m]
  )
)

# Extract error codes from messages
sum by (error_code) (
  rate(
    {app="api-service"}
    | regexp `error_code=(?P<error_code>\d+)`
    | error_code != ""
    [5m]
  )
)
```

## Comparing Error Rates Across Time

Track how error rates change:

```logql
# Current error rate vs 1 hour ago
sum by (app) (rate({namespace="production"} | json | level="error" [5m]))
-
sum by (app) (rate({namespace="production"} | json | level="error" [5m] offset 1h))

# Error rate increase percentage
(
  (
    sum by (app) (rate({namespace="production"} | json | level="error" [5m]))
    -
    sum by (app) (rate({namespace="production"} | json | level="error" [5m] offset 1h))
  )
  /
  sum by (app) (rate({namespace="production"} | json | level="error" [5m] offset 1h))
) * 100
```

## Aggregating by Time Windows

Count errors in different time windows:

```logql
# Errors in last 5 minutes
sum by (app) (
  count_over_time({namespace="production"} | json | level="error" [5m])
)

# Errors in last hour
sum by (app) (
  count_over_time({namespace="production"} | json | level="error" [1h])
)

# Errors in last 24 hours
sum by (app) (
  count_over_time({namespace="production"} | json | level="error" [24h])
)

# Compare error counts across windows
sum by (app) (count_over_time({namespace="production"} | json | level="error" [5m]))
/
sum by (app) (count_over_time({namespace="production"} | json | level="error" [1h]))
```

## Calculating Top Error Sources

Identify services with highest error rates:

```logql
# Top 10 services by error count
topk(10,
  sum by (app) (
    count_over_time({namespace="production"} | json | level="error" [1h])
  )
)

# Top 5 services by error percentage
topk(5,
  (
    sum by (app) (
      rate({namespace="production"} | json | level="error" [5m])
    )
    /
    sum by (app) (
      rate({namespace="production"} | json [5m])
    )
  ) * 100
)

# Bottom 5 performing services (highest errors)
bottomk(5,
  sum by (app) (
    rate({namespace="production"} | json | level="error" [5m])
  )
)
```

## Error Rate by Pod

Track which pods generate errors:

```logql
# Error rate per pod
sum by (pod) (
  rate(
    {namespace="production"}
    | json
    | level="error"
    [5m]
  )
)

# Identify problematic pods
topk(10,
  sum by (pod, app) (
    count_over_time(
      {namespace="production"}
      | json
      | level="error"
      [1h]
    )
  )
)

# Error rate variance across pods in same deployment
stddev by (app) (
  sum by (pod, app) (
    rate({namespace="production"} | json | level="error" [5m])
  )
)
```

## Using Line Filters for Performance

Optimize queries with efficient filtering:

```logql
# Fast: Filter before parsing
sum by (app) (
  rate(
    {namespace="production"}
    |= "error"        # Fast line filter first
    | json
    | level="error"
    [5m]
  )
)

# Multiple filters for precision
sum by (app) (
  rate(
    {namespace="production"}
    |= "error"
    != "deprecation"     # Exclude false positives
    | json
    | level="error"
    [5m]
  )
)
```

## Creating Error Rate Recording Rules

Pre-calculate common error rate queries:

```yaml
# Loki recording rule (requires Grafana Mimir or similar)
groups:
  - name: error_rates
    interval: 1m
    rules:
    - record: error_rate_per_service
      expr: |
        sum by (app, namespace) (
          rate({namespace=~".*"} | json | level="error" [5m])
        )

    - record: error_percentage_per_service
      expr: |
        (
          sum by (app) (
            rate({namespace="production"} | json | level="error" [5m])
          )
          /
          sum by (app) (
            rate({namespace="production"} | json [5m])
          )
        ) * 100
```

## Building Alert Rules from LogQL

Create alerts based on error rates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-rules
  namespace: monitoring
data:
  rules.yaml: |
    groups:
    - name: error_rate_alerts
      interval: 1m
      rules:
      # Alert on high error rate
      - alert: HighErrorRate
        expr: |
          (
            sum by (app) (
              rate({namespace="production"} | json | level="error" [5m])
            )
            /
            sum by (app) (
              rate({namespace="production"} | json [5m])
            )
          ) * 100 > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate for {{ $labels.app }}"
          description: "Service {{ $labels.app }} has {{ $value }}% error rate"

      # Alert on error spike
      - alert: ErrorRateSpike
        expr: |
          sum by (app) (rate({namespace="production"} | json | level="error" [5m]))
          >
          2 * sum by (app) (rate({namespace="production"} | json | level="error" [5m] offset 1h))
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate spike for {{ $labels.app }}"
          description: "Service {{ $labels.app }} error rate is 2x higher than 1 hour ago"
```

## Visualizing Error Rates in Grafana

Create Grafana dashboard queries:

```logql
# Time series of error rate per service
sum by (app) (
  rate({namespace="production"} | json | level="error" [5m])
)

# Stacked area chart of errors by service
sum by (app) (
  count_over_time({namespace="production"} | json | level="error" [5m])
)

# Heatmap of error distribution
sum by (app) (
  rate({namespace="production"} | json | level="error" [$__interval])
)

# Table of error counts
sum by (app) (
  count_over_time({namespace="production"} | json | level="error" [24h])
)
```

## Advanced: Correlating Errors with Deployments

Track error rate changes during deployments:

```logql
# Error rate with deployment version
sum by (app, version) (
  rate(
    {namespace="production"}
    | json
    | level="error"
    | version != ""
    [5m]
  )
)

# Compare error rates between versions
sum by (app, version) (
  rate({namespace="production"} | json | level="error" | version != "" [5m])
)
/
sum by (app) (
  rate({namespace="production"} | json | level="error" [5m] offset 1d)
)
```

## Conclusion

LogQL aggregation queries transform logs from diagnostic tools into operational metrics. By counting errors, calculating percentages, and tracking trends across microservices, you gain quantitative insights into application health. These queries power dashboards that show error rates in real-time, alerts that fire when errors spike, and analyses that identify which services need attention.

Start with basic error counting, then expand to multi-dimensional analysis, time-based comparisons, and automated alerting. Combine LogQL metrics with Prometheus metrics for comprehensive observability that leverages both structured metrics and unstructured logs to monitor Kubernetes microservice health.
