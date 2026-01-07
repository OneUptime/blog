# Monitor Traces with OneUptime: Follow Every Request the Easy Way

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Observability, Tracing, Traces, DevOps, OpenTelemetry

Description: Discover how to set up and manage OneUptime trace monitors as an end user so you can react to latency or error spikes without touching code.

---

Trace monitors watch the journey of each request through your services. They count matching spans on a schedule and alert you when performance drifts or traces disappear. Everything happens inside the dashboard with friendly forms, previews, and automation hookups.

---

## Why trace monitors matter

- Spot latency increases before customers complain.
- Catch missing traces that signal broken instrumentation or outages.
- Track errors or retries at a specific step in a workflow.
- Share a live picture of performance with the whole team.

---

## Set up a trace monitor

1. **Create a new monitor** and choose **Traces**.
2. **Name the monitor** after the user journey or span you care about, for example "Checkout latency".
3. **Describe the spans to watch** by filling in:
   - Span name or partial match (such as `GET /checkout`).
   - Span kind (server, client, internal, producer, consumer).
   - Services or attributes that should match (environment, region, partner, and so on).
   - Time window that each check should cover (start with one or five minutes).
   - Optional duration thresholds if you only want slow spans.
4. **Check the live preview** to make sure the right traces show up. Adjust filters until the results match your expectations.
5. **Pick a monitoring interval** so the monitor runs as frequently as you need.
6. **Configure alert rules** by setting how many spans should trigger a warning or critical alert. You can also trigger when spans disappear entirely.
7. **Connect the incident workflow** to your on-call rotation, notification channels, or automated runbooks.
8. **Save** and monitor activity in the chart and incident timeline.

The following query examples show how to filter spans in your trace monitor. These patterns help you target specific operations, services, or performance thresholds.

```sql
-- Trace filter query examples for OneUptime trace monitors
-- Use these patterns to target specific spans and operations

-- Monitor a specific API endpoint by span name
span.name = 'GET /api/v1/checkout' AND span.kind = 'server'

-- Filter by service and status: catch failed requests
service.name = 'checkout-service' AND span.status = 'ERROR'

-- Latency threshold: only spans slower than 2 seconds
span.duration > 2000 AND span.name CONTAINS '/checkout'

-- Monitor external dependencies: database calls
span.kind = 'client'
    AND span.name CONTAINS 'postgresql'
    AND span.duration > 500

-- Track specific user flows across services
attributes.user_flow = 'purchase'
    AND span.status = 'ERROR'

-- Regional monitoring: spans from specific deployment
attributes.region = 'us-east-1'
    AND service.name = 'payment-gateway'
    AND span.duration > 1000

-- Missing spans detection: use with count = 0 alert
span.name = 'scheduled-job-heartbeat'
    AND service.name = 'scheduler-service'
```

Here is an example of a properly instrumented span that works well with trace monitors. Following OpenTelemetry conventions ensures your traces are easy to filter and analyze.

```json
{
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "spanId": "00f067aa0ba902b7",
    "parentSpanId": "a3ce929d0e0e4736",
    "name": "POST /api/v1/checkout",
    "kind": "SPAN_KIND_SERVER",
    "startTimeUnixNano": "1698415800123456789",
    "endTimeUnixNano": "1698415802456789012",
    "status": {
        "code": "STATUS_CODE_OK",
        "message": ""
    },
    "attributes": [
        { "key": "http.method", "value": { "stringValue": "POST" } },
        { "key": "http.url", "value": { "stringValue": "/api/v1/checkout" } },
        { "key": "http.status_code", "value": { "intValue": 200 } },
        { "key": "service.name", "value": { "stringValue": "checkout-service" } },
        { "key": "deployment.environment", "value": { "stringValue": "production" } },
        { "key": "cloud.region", "value": { "stringValue": "us-east-1" } },
        { "key": "user.id", "value": { "stringValue": "user_12345" } }
    ],
    "events": [
        {
            "name": "cart_validated",
            "timeUnixNano": "1698415800500000000"
        },
        {
            "name": "payment_processed",
            "timeUnixNano": "1698415801800000000"
        }
    ]
}
```

---

## Common scenarios

- **Latency guardrail**: Alert when a specific span spends more than two seconds over the last few minutes.
- **Error burst**: Monitor spans with status "Error" and signal when the count spikes.
- **Missing telemetry**: Raise an incident if a key span does not appear for several intervals.
- **Regional watch**: Filter by a region attribute to keep each deployment healthy.

The following complete trace monitor configuration demonstrates a latency guardrail setup. This monitor watches checkout API performance and escalates when response times degrade.

```json
{
    "monitor": {
        "name": "Checkout API Latency Guardrail",
        "type": "traces",
        "description": "Alerts when checkout latency exceeds acceptable thresholds",

        "filter": {
            "spanName": "POST /api/v1/checkout",
            "spanKind": "server",
            "serviceName": "checkout-service",
            "attributes": {
                "deployment.environment": "production"
            },
            "durationThreshold": {
                "operator": ">",
                "value": 2000,
                "unit": "ms"
            },
            "timeWindow": "5m"
        },

        "schedule": {
            "interval": "1m"
        },

        "alertRules": [
            {
                "name": "Latency Warning",
                "condition": "count >= 5",
                "severity": "warning",
                "message": "Multiple slow checkout requests detected (>2s)"
            },
            {
                "name": "Latency Critical",
                "condition": "count >= 20",
                "severity": "critical",
                "message": "Checkout latency severely degraded - immediate investigation required"
            },
            {
                "name": "P95 Threshold",
                "condition": "p95(duration) > 3000",
                "severity": "critical",
                "message": "95th percentile checkout latency exceeds 3 seconds"
            }
        ],

        "notifications": {
            "onCall": "checkout-team",
            "slack": "#checkout-alerts",
            "statusPage": "checkout-api"
        }
    }
}
```

---

## Keep alerts useful

- Use the preview every time you change filters so you know what will trigger.
- Add separate warning and critical rules to encourage early investigation without constant paging.
- Group monitors by feature area so the right teams own them.
- Review the monitor history after an incident to adjust thresholds and reduce noise.

---

## Quick troubleshooting

- **No spans match**: Double-check the span name and attributes, and widen the time window temporarily.
- **Too many alerts**: Narrow the filters, shorten the window, or increase the required count before an alert fires.
- **Alerts never clear**: Lower the duration threshold or adjust the criteria so they match your new steady state.

---

Trace monitors turn distributed tracing into actionable guardrails. Pair them with log and metric monitors to see the full picture: what happened, where it happened, and how big the impact is- all without writing a single query by hand.
