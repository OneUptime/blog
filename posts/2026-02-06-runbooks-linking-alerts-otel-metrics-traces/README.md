# How to Write Runbooks That Link Alerting Rules to Specific OpenTelemetry Metrics and Trace Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Runbooks, Alerting, Incident Response

Description: Write effective runbooks that connect alerting rules directly to the OpenTelemetry metrics and trace queries engineers need during incident response.

An alert fires at 2 AM. The on-call engineer opens the runbook and finds a paragraph that says "check the dashboard." Which dashboard? What should they look for? If the runbook does not connect the alert directly to specific metrics and trace queries, it is not a runbook. It is a wish.

Here is how to write runbooks that actually help.

## Runbook Structure

Every runbook entry should follow this template:

```markdown
## Alert: [Alert Name]

**Metric**: The exact metric and PromQL/query that triggers this alert
**Threshold**: What value triggers the alert and for how long
**Severity**: P1/P2/P3/P4
**Owner**: Team and on-call rotation

### What This Means
One sentence explaining the business impact of this alert.

### First Response (< 5 minutes)
Step-by-step triage commands with exact queries to run.

### Diagnosis
Deeper investigation steps with trace queries and dashboard links.

### Remediation
How to fix the most common root causes.

### Escalation
When and to whom to escalate.
```

## Example: High Error Rate Alert

```markdown
## Alert: order-service-high-error-rate

**Metric**:
```promql
sum(rate(http_server_request_duration_seconds_count{
  service_name="order-service",
  http_response_status_code=~"5.."
}[5m])) /
sum(rate(http_server_request_duration_seconds_count{
  service_name="order-service"
}[5m])) > 0.05
```

**Threshold**: Error rate > 5% for 5 minutes
**Severity**: P2
**Owner**: checkout-team (checkout-primary PagerDuty rotation)

### What This Means
More than 5% of requests to the order service are returning 5xx errors.
Customers may be unable to complete purchases.

### First Response (< 5 minutes)

1. Check if this is a deployment-related issue:
   ```bash
   kubectl rollout history deployment/order-service -n commerce
   # If a rollout happened in the last 30 minutes, consider rolling back
   ```

2. Check the error breakdown by endpoint:
   ```promql
   sum by (http_route, http_response_status_code) (
     rate(http_server_request_duration_seconds_count{
       service_name="order-service",
       http_response_status_code=~"5.."
     }[5m])
   )
   ```

3. Find error traces in your observability backend:
   ```
   # Tempo/Grafana TraceQL query
   {
     resource.service.name = "order-service"
     && status = error
     && span.http.response.status_code >= 500
   } | select(span.http.route, status)
   ```

### Diagnosis

Pick one of the error traces from step 3 and examine the waterfall.
Look for:
- Which span has the error status? Is it the order-service itself or a downstream dependency?
- Check the exception event on the error span for the stack trace
- If the error originates from a downstream service, check that service's health

Common patterns:
- **Database timeout**: Look for spans with `db.system=postgresql` that have durations > 5s
  ```
  {
    resource.service.name = "order-service"
    && span.db.system = "postgresql"
    && duration > 5s
  }
  ```
- **Downstream service failure**: Look for HTTP client spans with 5xx responses
  ```
  {
    resource.service.name = "order-service"
    && kind = client
    && span.http.response.status_code >= 500
  }
  ```
- **Memory pressure**: Check the runtime metrics dashboard
  ```promql
  process_runtime_jvm_memory_usage_bytes{service_name="order-service"}
  ```

### Remediation

| Root Cause | Action |
|-----------|--------|
| Bad deployment | `kubectl rollout undo deployment/order-service -n commerce` |
| Database overload | Check slow query log, consider read replica routing |
| Downstream outage | Enable circuit breaker, check downstream service status |
| Memory pressure | Restart pods, investigate memory leak |

### Escalation
- If error rate > 20%: Escalate to P1, page engineering manager
- If database-related: Page the database team (dba-oncall)
- If unresolved after 30 minutes: Page the checkout team lead
```

## Example: Latency Degradation Alert

```markdown
## Alert: order-service-latency-p99

**Metric**:
```promql
histogram_quantile(0.99,
  sum(rate(http_server_request_duration_seconds_bucket{
    service_name="order-service",
    http_route="/api/v1/orders"
  }[5m])) by (le)
) > 2.0
```

**Threshold**: P99 latency > 2 seconds for 5 minutes
**Severity**: P3
**Owner**: checkout-team

### What This Means
The slowest 1% of order creation requests are taking longer than 2 seconds.
This may indicate a performance regression or resource contention.

### First Response

1. Check if latency is isolated to one endpoint or widespread:
   ```promql
   histogram_quantile(0.99,
     sum by (http_route, le) (
       rate(http_server_request_duration_seconds_bucket{
         service_name="order-service"
       }[5m])
     )
   )
   ```

2. Find the slowest traces:
   ```
   {
     resource.service.name = "order-service"
     && name = "HTTP POST /api/v1/orders"
     && duration > 2s
   }
   ```

3. In the trace waterfall, identify the slowest child span.
   The bottleneck is usually the longest bar in the waterfall.
```

## Linking Alerts to Queries Programmatically

You can generate runbook links directly in your alerting rules using annotations:

```yaml
# Prometheus alerting rule with runbook and query links
groups:
  - name: order-service
    rules:
      - alert: OrderServiceHighErrorRate
        expr: |
          sum(rate(http_server_request_duration_seconds_count{
            service_name="order-service",
            http_response_status_code=~"5.."}[5m])) /
          sum(rate(http_server_request_duration_seconds_count{
            service_name="order-service"}[5m])) > 0.05
        for: 5m
        labels:
          severity: p2
          team: checkout-team
        annotations:
          summary: "Order service error rate is {{ $value | humanizePercentage }}"
          runbook_url: "https://runbooks.internal/order-service-high-error-rate"
          trace_query: |
            {resource.service.name="order-service" && status=error}
          dashboard_url: "https://grafana.internal/d/order-service/overview?from=now-1h"
```

When the alert fires, the on-call engineer gets direct links to the runbook, relevant traces, and the dashboard. No hunting required.

## Keeping Runbooks Current

Runbooks rot fast. Here is how to prevent that:

- After every incident, update the relevant runbook as part of the postmortem action items
- Include the runbook in the service's repository, not a separate wiki
- Test runbooks during game days by having someone follow them step by step
- Add a "last verified" date to each runbook entry

Write your runbooks with the assumption that the reader is stressed, tired, and unfamiliar with the service. Every query should be copy-pasteable. Every step should be specific. Every link should work. That is what turns a runbook from documentation into a tool that actually reduces incident duration.
