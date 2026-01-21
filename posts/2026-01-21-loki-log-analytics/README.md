# How to Implement Log Analytics with Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Log Analytics, LogQL, Observability, Error Analysis, Trend Detection

Description: A comprehensive guide to implementing log analytics with Grafana Loki, covering error pattern detection, trend analysis, anomaly identification, and building actionable insights from log data.

---

Log analytics transforms raw log data into actionable insights. With Grafana Loki and LogQL, you can analyze error patterns, detect anomalies, identify trends, and understand system behavior at scale. This guide covers practical techniques for implementing log analytics that help teams make data-driven decisions about their systems.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki 2.4 or later with historical data
- Grafana 9.0 or later for visualization
- Structured logs with consistent formats
- Basic understanding of LogQL queries

## Log Analytics Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Log Analytics Pipeline                         │
│                                                                   │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐               │
│  │ Collection │──▶│ Processing │──▶│  Storage   │               │
│  │ (Promtail) │   │ (Parsing)  │   │  (Loki)    │               │
│  └────────────┘   └────────────┘   └────────────┘               │
│                                            │                      │
│                                            ▼                      │
│                    ┌─────────────────────────────────┐           │
│                    │        Analytics Layer          │           │
│                    │  - Pattern Detection            │           │
│                    │  - Trend Analysis               │           │
│                    │  - Anomaly Identification       │           │
│                    │  - Statistical Aggregations     │           │
│                    └─────────────────────────────────┘           │
│                                            │                      │
│                                            ▼                      │
│                    ┌─────────────────────────────────┐           │
│                    │     Insights & Actions          │           │
│                    │  - Dashboards                   │           │
│                    │  - Alerts                       │           │
│                    │  - Reports                      │           │
│                    └─────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

## Error Pattern Analysis

### Counting Errors Over Time

```logql
# Error count over time by service
sum by (service) (
  count_over_time({job="application"} | json | level="error" [5m])
)

# Error rate per second
sum by (service) (
  rate({job="application"} | json | level="error" [5m])
)
```

### Top Error Messages

```logql
# Most frequent error messages
topk(10,
  sum by (error_message) (
    count_over_time({job="application"} | json | level="error" [$__range])
  )
)

# Top errors by service
topk(5,
  sum by (service, error_type) (
    count_over_time({job="application"} | json | level="error" [$__range])
  )
)
```

### Error Distribution Analysis

```logql
# Error distribution by type
sum by (error_type) (
  count_over_time({job="application"} | json | level="error" [$__range])
)

# Error distribution by endpoint
sum by (endpoint) (
  count_over_time({job="application"} | json | level="error" [$__range])
)

# Errors by HTTP status code
sum by (status_code) (
  count_over_time({job="application"} | json | status_code >= 400 [$__range])
)
```

### Error Correlation Analysis

```logql
# Find errors that occur together
{job="application"} | json | level="error"
| line_format "{{.timestamp}} - {{.service}}: {{.error_type}}"

# Errors within a time window of each other (manual correlation)
{job="application"}
| json
| level="error"
| label_format time_bucket="{{__timestamp__ | date \"2006-01-02T15:04\" }}"
```

## Trend Analysis

### Log Volume Trends

```logql
# Log volume over time
sum(rate({job="application"} [1h]))

# Log volume by service
sum by (service) (rate({job="application"} [1h]))

# Log volume comparison - current vs previous period
# Current hour
sum(count_over_time({job="application"} [1h]))
# Previous hour (use offset)
sum(count_over_time({job="application"} [1h] offset 1h))
```

### Error Trend Detection

```logql
# Error trend - is it increasing?
# Calculate rate of change
(
  sum(count_over_time({job="application"} | json | level="error" [1h]))
  -
  sum(count_over_time({job="application"} | json | level="error" [1h] offset 1h))
)
/
sum(count_over_time({job="application"} | json | level="error" [1h] offset 1h))
* 100

# Rolling average of errors
avg_over_time(
  sum(rate({job="application"} | json | level="error" [5m])) [1h:5m]
)
```

### Seasonal Pattern Analysis

```logql
# Compare current period with same time yesterday
# Current
sum(count_over_time({job="application"} [1h]))
# Same time yesterday
sum(count_over_time({job="application"} [1h] offset 24h))
# Same time last week
sum(count_over_time({job="application"} [1h] offset 168h))
```

## Performance Analytics

### Latency Analysis from Logs

```logql
# Average latency by endpoint
avg_over_time(
  {job="application"}
  | json
  | unwrap duration [5m]
) by (endpoint)

# P50, P95, P99 latency
quantile_over_time(0.50, {job="application"} | json | unwrap duration [5m]) by (service)
quantile_over_time(0.95, {job="application"} | json | unwrap duration [5m]) by (service)
quantile_over_time(0.99, {job="application"} | json | unwrap duration [5m]) by (service)

# Latency distribution buckets
sum by (le) (
  {job="application"}
  | json
  | duration <= 100 | __error__="" | le="100ms"
)
```

### Slow Request Analysis

```logql
# Find slow requests (> 5 seconds)
{job="application"}
| json
| duration > 5
| line_format "{{.timestamp}} - {{.endpoint}} took {{.duration}}s"

# Count slow requests by endpoint
sum by (endpoint) (
  count_over_time({job="application"} | json | duration > 5 [$__range])
)

# Percentage of slow requests
sum(count_over_time({job="application"} | json | duration > 5 [$__range]))
/
sum(count_over_time({job="application"} | json [$__range]))
* 100
```

### Throughput Analysis

```logql
# Requests per second by service
sum by (service) (rate({job="application"} | json | endpoint=~".+" [5m]))

# Peak throughput
max_over_time(
  sum(rate({job="application"} [1m])) [1h:1m]
)
```

## User Behavior Analytics

### Session Analysis

```logql
# Unique users over time
count(
  sum by (user_id) (
    count_over_time({job="application"} | json | user_id!="" [1h])
  )
)

# Actions per user session
sum by (session_id) (
  count_over_time({job="application"} | json | session_id!="" [1h])
)

# Most active users
topk(10,
  sum by (user_id) (
    count_over_time({job="application"} | json | user_id!="" [$__range])
  )
)
```

### Feature Usage Analytics

```logql
# Feature usage count
sum by (feature) (
  count_over_time({job="application"} | json | event_type="feature_used" [$__range])
)

# Most used API endpoints
topk(20,
  sum by (endpoint) (
    count_over_time({job="application"} | json | endpoint!="" [$__range])
  )
)

# Feature adoption over time
sum by (feature) (
  rate({job="application"} | json | event_type="feature_used" [1h])
)
```

### Funnel Analysis from Logs

```logql
# Step 1: Page views
sum(count_over_time({job="application"} | json | event="page_view" [$__range]))

# Step 2: Add to cart
sum(count_over_time({job="application"} | json | event="add_to_cart" [$__range]))

# Step 3: Checkout started
sum(count_over_time({job="application"} | json | event="checkout_started" [$__range]))

# Step 4: Purchase completed
sum(count_over_time({job="application"} | json | event="purchase_completed" [$__range]))
```

## Anomaly Detection

### Statistical Anomaly Detection

```logql
# Detect error spikes using standard deviation
# Calculate if current rate exceeds 2 standard deviations from mean
# (Simplified - actual implementation needs baseline calculation)

# Current error rate
sum(rate({job="application"} | json | level="error" [5m]))

# Average error rate over past week
avg_over_time(
  sum(rate({job="application"} | json | level="error" [5m])) [7d:1h]
)

# Standard deviation (approximate using range)
stddev_over_time(
  sum(rate({job="application"} | json | level="error" [5m])) [7d:1h]
)
```

### Unusual Pattern Detection

```logql
# Detect unusual HTTP methods
{job="application"}
| json
| http_method!~"GET|POST|PUT|DELETE|PATCH"
| line_format "Unusual method: {{.http_method}} on {{.endpoint}}"

# Detect unusually large requests
{job="application"}
| json
| request_size > 10000000
| line_format "Large request: {{.request_size}} bytes to {{.endpoint}}"

# Detect requests at unusual times
{job="application"}
| json
| hour >= 0 and hour < 6
| line_format "Off-hours request: {{.endpoint}} at {{.timestamp}}"
```

### Absence Detection

```logql
# Detect missing expected logs
absent_over_time({job="application", service="payment-service"} [10m])

# Detect missing heartbeats
absent_over_time({job="application"} |= "heartbeat" [5m])
```

## Security Analytics

### Authentication Analysis

```logql
# Failed login attempts by source
sum by (source_ip) (
  count_over_time({job="auth-service"} |= "authentication failed" | json [$__range])
)

# Successful vs failed logins
sum by (status) (
  count_over_time({job="auth-service"} |= "authentication" | json | status=~"success|failed" [$__range])
)

# Login attempts over time
sum by (status) (
  rate({job="auth-service"} |= "authentication" | json [5m])
)
```

### Suspicious Activity Detection

```logql
# SQL injection attempts
count_over_time(
  {job="application"}
  |~ "(?i)(union.*select|;.*drop|'.*or.*'|\".*or.*\")"
  [$__range]
)

# Path traversal attempts
count_over_time(
  {job="application"}
  |~ "\\.\\./|%2e%2e"
  [$__range]
)

# Unusual user agents
{job="application"}
| json
| user_agent!~"Mozilla|Chrome|Safari|Firefox|Edge"
| user_agent!=""
| line_format "Unusual UA: {{.user_agent}}"
```

### Access Pattern Analysis

```logql
# Access to sensitive endpoints
sum by (endpoint, user_id) (
  count_over_time(
    {job="application"}
    | json
    | endpoint=~"/admin.*|/api/users.*|/api/settings.*"
    [$__range]
  )
)

# After-hours access
count_over_time(
  {job="application"}
  | json
  | endpoint=~"/admin.*"
  [24h]
)
```

## Building Analytics Dashboards

### Error Analytics Dashboard

```json
{
  "dashboard": {
    "title": "Error Analytics",
    "panels": [
      {
        "title": "Error Rate Trend",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum by (service) (rate({job=\"application\"} | json | level=\"error\" [$__interval]))",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Top Error Types",
        "type": "piechart",
        "targets": [
          {
            "expr": "topk(10, sum by (error_type) (count_over_time({job=\"application\"} | json | level=\"error\" [$__range])))",
            "instant": true
          }
        ]
      },
      {
        "title": "Error Rate vs Yesterday",
        "type": "stat",
        "targets": [
          {
            "expr": "(sum(count_over_time({job=\"application\"} | json | level=\"error\" [$__range])) - sum(count_over_time({job=\"application\"} | json | level=\"error\" [$__range] offset 24h))) / sum(count_over_time({job=\"application\"} | json | level=\"error\" [$__range] offset 24h)) * 100"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent"
          }
        }
      },
      {
        "title": "Recent Errors",
        "type": "logs",
        "targets": [
          {
            "expr": "{job=\"application\"} | json | level=\"error\""
          }
        ]
      }
    ]
  }
}
```

### Performance Analytics Dashboard

```json
{
  "dashboard": {
    "title": "Performance Analytics",
    "panels": [
      {
        "title": "Latency Percentiles",
        "type": "timeseries",
        "targets": [
          {
            "expr": "quantile_over_time(0.50, {job=\"application\"} | json | unwrap duration [$__interval])",
            "legendFormat": "P50"
          },
          {
            "expr": "quantile_over_time(0.95, {job=\"application\"} | json | unwrap duration [$__interval])",
            "legendFormat": "P95"
          },
          {
            "expr": "quantile_over_time(0.99, {job=\"application\"} | json | unwrap duration [$__interval])",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "Slowest Endpoints",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, avg by (endpoint) (avg_over_time({job=\"application\"} | json | unwrap duration [$__range])))",
            "instant": true
          }
        ]
      },
      {
        "title": "Throughput",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate({job=\"application\"} | json [$__interval]))",
            "legendFormat": "Requests/s"
          }
        ]
      }
    ]
  }
}
```

## Recording Rules for Analytics

Create recording rules in Loki to pre-compute expensive analytics queries:

```yaml
# loki-rules/analytics-recording-rules.yaml
groups:
  - name: analytics
    interval: 1m
    rules:
      # Error rate by service
      - record: log:error_rate:5m
        expr: |
          sum by (service) (
            rate({job="application"} | json | level="error" [5m])
          )

      # Request rate by service
      - record: log:request_rate:5m
        expr: |
          sum by (service) (
            rate({job="application"} | json [5m])
          )

      # P95 latency by service
      - record: log:latency_p95:5m
        expr: |
          quantile_over_time(0.95,
            {job="application"} | json | unwrap duration [5m]
          ) by (service)

      # Error percentage
      - record: log:error_percentage:5m
        expr: |
          log:error_rate:5m / log:request_rate:5m * 100
```

## Exporting Analytics Data

### Export to CSV

```bash
# Query Loki API and export to CSV
curl -G 'http://localhost:3100/loki/api/v1/query_range' \
  --data-urlencode 'query=sum by (service) (count_over_time({job="application"} | json | level="error" [1h]))' \
  --data-urlencode 'start=2024-01-01T00:00:00Z' \
  --data-urlencode 'end=2024-01-07T00:00:00Z' \
  --data-urlencode 'step=1h' | \
  jq -r '.data.result[] | [.metric.service, .values[]] | @csv' > errors.csv
```

### Analytics API Queries

```bash
# Get error summary
curl -G 'http://localhost:3100/loki/api/v1/query' \
  --data-urlencode 'query=topk(10, sum by (error_type) (count_over_time({job="application"} | json | level="error" [24h])))' | \
  jq '.data.result'

# Get service statistics
curl -G 'http://localhost:3100/loki/api/v1/query' \
  --data-urlencode 'query=sum by (service) (count_over_time({job="application"} [24h]))' | \
  jq '.data.result'
```

## Best Practices

1. **Structured Logging**: Use consistent JSON format for easier analytics
2. **Appropriate Labels**: Use labels for dimensions you frequently filter by
3. **Time Windows**: Choose appropriate time windows for different analytics
4. **Recording Rules**: Pre-compute expensive queries with recording rules
5. **Dashboard Variables**: Use variables for flexible, reusable dashboards
6. **Regular Review**: Schedule periodic review of analytics insights
7. **Alert Integration**: Create alerts based on analytics thresholds

## Conclusion

Log analytics with Loki transforms raw log data into actionable insights that help teams understand system behavior, identify problems, and make data-driven decisions. By implementing error analysis, trend detection, performance analytics, and security monitoring, you can build a comprehensive observability solution that provides deep visibility into your applications.

Key takeaways:
- Use LogQL metric queries for quantitative analysis
- Implement pattern detection for error categorization
- Track trends over time for proactive monitoring
- Build anomaly detection for early problem identification
- Create analytics dashboards for team visibility
- Use recording rules to optimize expensive queries
- Export data for external analysis when needed
