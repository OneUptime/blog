# Monitor Metrics with OneUptime: Turn Numbers into Action Without Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Observability, Metrics, DevOps, OpenTelemetry

Description: Learn how to set up metric monitors in OneUptime using the built-in dashboards so you can watch key KPIs and act quickly when numbers drift.

---

Metrics tell you when performance is slipping, capacity is filling up, or success rates drop. OneUptime wraps that information in a guided experience so you can build powerful metric monitors with clicks, not code.

---

## What you get with metric monitors

- A rolling view of the metric slice you choose, refreshed on the schedule you set.
- Friendly chart previews while you configure the monitor.
- Alerts and incidents that follow your own thresholds.
- Full history and automation hooks shared with every other monitor type.

---

## Build a metric monitor step by step

1. **Create a new monitor** and select **Metrics**.
2. **Name it clearly**, for example "Checkout success rate" or "API latency".
3. **Choose the time window** (one minute, fifteen minutes, one hour, and so on) to decide how far back each check will look.
4. **Pick the metric data** using the MetricView builder:
   - Select the metric (such as request count, latency, CPU usage).
   - Add filters for tags like region, environment, or service.
   - Optional: group results (for example by status code) or build formulas (like errors divided by total requests).
5. **Watch the live chart** to confirm the monitor matches real data. Tweak filters until it looks right.
6. **Set alert rules** by deciding when a warning or critical alert should fire. Examples: warning at 1% error rate, critical at 3%.
7. **Connect automation** to on-call schedules, Slack channels, email, webhooks, or workflows.
8. **Save** and let the monitor run on its schedule.

The following PromQL-style query examples show common metric patterns for monitoring. These queries help you target specific metrics and calculate meaningful aggregations.

```promql
# Metric query examples for OneUptime metric monitors
# Use these patterns to build effective alerting rules

# Request rate: total requests per second over 5 minutes
rate(http_requests_total{service="checkout-service"}[5m])

# Error rate percentage: errors divided by total requests
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m])) * 100

# P95 latency: 95th percentile response time
histogram_quantile(0.95,
    sum(rate(http_request_duration_seconds_bucket{service="api"}[5m]))
    by (le)
)

# CPU utilization percentage by service
avg(rate(container_cpu_usage_seconds_total{service="checkout"}[5m])) * 100

# Memory usage percentage
container_memory_usage_bytes{service="checkout"}
/
container_memory_limit_bytes{service="checkout"} * 100

# Request throughput by endpoint
sum by (endpoint) (
    rate(http_requests_total{service="api"}[5m])
)

# Apdex score calculation (satisfied + tolerating/2) / total
(
    sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
    +
    sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) / 2
)
/
sum(rate(http_request_duration_seconds_count[5m]))
```

Here is an example metric data point following OpenTelemetry conventions. Consistent metric naming and labeling makes monitors more effective and easier to maintain.

```json
{
    "resourceMetrics": [
        {
            "resource": {
                "attributes": [
                    { "key": "service.name", "value": { "stringValue": "checkout-service" } },
                    { "key": "deployment.environment", "value": { "stringValue": "production" } },
                    { "key": "cloud.region", "value": { "stringValue": "us-east-1" } }
                ]
            },
            "scopeMetrics": [
                {
                    "scope": {
                        "name": "checkout-instrumentation",
                        "version": "1.0.0"
                    },
                    "metrics": [
                        {
                            "name": "http.server.request.duration",
                            "description": "Duration of HTTP server requests",
                            "unit": "ms",
                            "histogram": {
                                "dataPoints": [
                                    {
                                        "startTimeUnixNano": "1698415800000000000",
                                        "timeUnixNano": "1698415860000000000",
                                        "count": 1250,
                                        "sum": 45678.9,
                                        "bucketCounts": [100, 450, 500, 150, 40, 10],
                                        "explicitBounds": [50, 100, 250, 500, 1000],
                                        "attributes": [
                                            { "key": "http.method", "value": { "stringValue": "POST" } },
                                            { "key": "http.route", "value": { "stringValue": "/api/v1/checkout" } },
                                            { "key": "http.status_code", "value": { "intValue": 200 } }
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
    ]
}
```

---

## Everyday examples

- **Latency guardrails**: Alert when the P95 latency of your checkout API rises above two seconds.
- **Error ratios**: Build a formula for errors divided by total requests and notify the team when it climbs.
- **Traffic shifts**: Watch request volume per region and flag sudden drops or spikes.
- **Infrastructure health**: Track CPU or memory utilization so you can scale before saturation.

The following complete metric monitor configuration demonstrates an error rate monitoring setup. This monitor calculates the percentage of failed requests and triggers alerts when error rates exceed acceptable thresholds.

```json
{
    "monitor": {
        "name": "Checkout Error Rate",
        "type": "metrics",
        "description": "Monitors checkout service error rate and alerts on degradation",

        "metricQuery": {
            "formula": "(errors / total) * 100",
            "variables": {
                "errors": {
                    "metric": "http_requests_total",
                    "aggregation": "sum",
                    "filters": {
                        "service": "checkout-service",
                        "status": "5xx",
                        "environment": "production"
                    },
                    "timeWindow": "5m"
                },
                "total": {
                    "metric": "http_requests_total",
                    "aggregation": "sum",
                    "filters": {
                        "service": "checkout-service",
                        "environment": "production"
                    },
                    "timeWindow": "5m"
                }
            }
        },

        "schedule": {
            "interval": "1m"
        },

        "alertRules": [
            {
                "name": "Error Rate Warning",
                "condition": "value >= 1",
                "severity": "warning",
                "message": "Checkout error rate above 1%"
            },
            {
                "name": "Error Rate Critical",
                "condition": "value >= 3",
                "severity": "critical",
                "message": "Checkout error rate critical (>3%) - immediate action required"
            },
            {
                "name": "Error Rate Emergency",
                "condition": "value >= 10",
                "severity": "emergency",
                "message": "Checkout experiencing major outage (>10% errors)"
            }
        ],

        "notifications": {
            "onCall": "checkout-team",
            "slack": "#checkout-alerts",
            "statusPage": "checkout-component",
            "escalation": {
                "afterMinutes": 15,
                "escalateTo": "engineering-leads"
            }
        }
    }
}
```

For infrastructure monitoring, use this configuration pattern to track CPU utilization across your services. This helps prevent performance degradation by alerting before resources become saturated.

```json
{
    "monitor": {
        "name": "Service CPU Utilization",
        "type": "metrics",
        "description": "Monitors CPU usage across production services",

        "metricQuery": {
            "metric": "container_cpu_usage_percent",
            "aggregation": "avg",
            "groupBy": ["service", "instance"],
            "filters": {
                "environment": "production"
            },
            "timeWindow": "5m"
        },

        "schedule": {
            "interval": "1m"
        },

        "alertRules": [
            {
                "name": "High CPU Warning",
                "condition": "value >= 70",
                "duration": "5m",
                "severity": "warning",
                "message": "CPU utilization sustained above 70%"
            },
            {
                "name": "Critical CPU",
                "condition": "value >= 90",
                "duration": "2m",
                "severity": "critical",
                "message": "CPU utilization critical - scaling or investigation needed"
            }
        ],

        "notifications": {
            "onCall": "platform-team",
            "slack": "#infrastructure-alerts"
        }
    }
}
```

---

## Make alerts meaningful

- Pair short windows for quick detection with longer windows for stability.
- Use separate warning and critical levels to avoid unnecessary paging.
- Add maintenance windows when planned work would otherwise trigger alerts.
- Review historical charts after an incident to tune thresholds.

---

## Quick fixes when things feel off

- **No data in the preview?** Double-check the metric name and filters. Try a wider time range to confirm data exists.
- **Alerts too noisy?** Raise the threshold, shorten the window, or simplify the formula.
- **Need to pause monitoring?** Switch the monitor to maintenance mode from its detail page.

---

Metric monitors help you stay ahead of the numbers that matter. Combine them with log and trace monitors to build incidents that show what went wrong, where it happened, and how big the impact is- all without writing custom scripts.
