# How to Define Cross-Team Telemetry Data Ownership Policies Using OpenTelemetry Resource Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Data Ownership, Resource Attributes, Governance

Description: Define clear telemetry data ownership policies using OpenTelemetry resource attributes to manage costs, quality, and accountability across teams.

As your organization grows, telemetry data becomes a shared resource with real costs. Without clear ownership, nobody is responsible for reducing noisy metrics, cleaning up unused dashboards, or fixing broken instrumentation. Resource attributes in OpenTelemetry provide the technical mechanism to assign ownership and enforce policies at the pipeline level.

## Why Ownership Matters

Telemetry data is not free. Storage, processing, and network costs scale with volume. When nobody owns a particular stream of data, three problems emerge:

1. Nobody optimizes it - noisy, low-value telemetry accumulates
2. Nobody fixes it - broken instrumentation stays broken
3. Nobody budgets for it - costs surprise everyone quarterly

Resource attributes let you tag every piece of telemetry with ownership information, enabling cost attribution, quality monitoring, and clear accountability.

## Defining Ownership Attributes

Add these resource attributes to every service in your organization:

```yaml
# Required ownership resource attributes
resource:
  service.name: "order-service"
  service.namespace: "commerce"        # Business domain
  service.team: "checkout-team"        # Owning team
  service.cost_center: "eng-commerce"  # For cost attribution
  service.oncall: "checkout-primary"   # PagerDuty schedule name
```

Configure these through environment variables so they are set during deployment, not hardcoded:

```python
import os
from opentelemetry.sdk.resources import Resource

# Resource attributes set via deployment configuration
resource = Resource.create({
    "service.name": os.getenv("OTEL_SERVICE_NAME"),
    "service.namespace": os.getenv("SERVICE_NAMESPACE"),
    "service.team": os.getenv("SERVICE_TEAM"),
    "service.cost_center": os.getenv("SERVICE_COST_CENTER"),
    "service.oncall": os.getenv("SERVICE_ONCALL_SCHEDULE"),
})
```

In your Kubernetes manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  labels:
    app.kubernetes.io/name: order-service
    team: checkout-team
spec:
  template:
    spec:
      containers:
        - name: order-service
          env:
            - name: OTEL_SERVICE_NAME
              value: "order-service"
            - name: SERVICE_NAMESPACE
              value: "commerce"
            - name: SERVICE_TEAM
              value: "checkout-team"
            - name: SERVICE_COST_CENTER
              value: "eng-commerce"
            - name: SERVICE_ONCALL_SCHEDULE
              value: "checkout-primary"
```

## Enforcing Ownership at the Collector

Use the OpenTelemetry Collector to validate that ownership attributes are present on all incoming telemetry:

```yaml
# collector-config.yaml
processors:
  # Add default ownership attributes if they are missing
  # This acts as a safety net, not a replacement for proper configuration
  resource/defaults:
    attributes:
      - key: service.team
        value: "unknown"
        action: upsert
      - key: service.cost_center
        value: "unattributed"
        action: upsert

  # Route telemetry based on ownership
  routing:
    default_exporters: [otlp/default]
    table:
      # High-priority teams get dedicated export pipelines
      - statement: route() where resource.attributes["service.namespace"] == "commerce"
        exporters: [otlp/commerce-dedicated]
      - statement: route() where resource.attributes["service.namespace"] == "platform"
        exporters: [otlp/platform-dedicated]
```

## Cost Attribution

With ownership attributes in place, you can calculate per-team telemetry costs. Query your telemetry backend to measure volume by team:

```promql
# Prometheus query: spans ingested per team per day
sum by (service_team) (
  rate(otelcol_receiver_accepted_spans_total[24h])
) * 86400
```

Build a dashboard that shows each team their telemetry volume and estimated cost:

```sql
-- SQL query for a cost attribution report
-- Adjust the cost_per_gb value for your backend
SELECT
    resource_attributes['service.team'] AS team,
    resource_attributes['service.cost_center'] AS cost_center,
    SUM(data_size_bytes) / 1073741824.0 AS total_gb,
    SUM(data_size_bytes) / 1073741824.0 * 0.50 AS estimated_cost_usd
FROM telemetry_ingestion_log
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY team, cost_center
ORDER BY total_gb DESC;
```

## Quality Monitoring

Ownership enables quality monitoring. Track instrumentation quality per team:

```python
# Script to check instrumentation quality by team
# Run this periodically and publish results to a dashboard

quality_checks = {
    "has_error_handling": "spans with status=ERROR should have exception events",
    "uses_naming_convention": "span names should match <verb>.<noun> pattern",
    "no_high_cardinality_metrics": "metric attributes should have < 100 unique values",
    "context_propagation": "multi-service traces should not have orphaned spans",
}

# Query your backend for quality metrics per team
# Example: percentage of error spans that include exception details
# Good teams will have >95%, struggling teams will have <50%
```

## The Ownership Policy Document

Write a short policy document that teams agree to:

```markdown
## Telemetry Data Ownership Policy

### Responsibilities
Each team that owns a service is responsible for:
1. Setting correct resource attributes on all telemetry
2. Keeping telemetry volume within their allocated budget
3. Fixing broken instrumentation within 5 business days of notification
4. Reviewing and cleaning up unused metrics and dashboards quarterly

### Escalation
If a service emits telemetry without ownership attributes:
1. The collector adds "unknown" team attribution
2. The observability platform team contacts the service owner
3. If unresolved in 10 days, the telemetry is sampled at 1%

### Budget
Each team receives a monthly telemetry budget based on their service count.
Overages are reported monthly. Teams exceeding budget by >50% for two
consecutive months must submit an optimization plan.
```

## Practical Implementation Order

Do not try to implement everything at once. Follow this sequence:

1. Add `service.team` and `service.namespace` to all services (week 1-2)
2. Build a cost attribution dashboard (week 3)
3. Share per-team costs with engineering managers (week 4)
4. Set budgets and start monitoring (month 2)
5. Enforce policies through collector processing (month 3)

Start with visibility before enforcement. Teams that can see their costs will self-optimize before you need to enforce anything.

Resource attributes are the foundation of telemetry governance. They connect every span, metric, and log to a team that is accountable for its quality and cost. Define your ownership attributes, enforce them at the pipeline level, and use them to build a culture where teams take responsibility for their observability data.
