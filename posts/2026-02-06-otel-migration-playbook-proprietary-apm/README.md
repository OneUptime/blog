# How to Create an OpenTelemetry Migration Playbook for Transitioning from Proprietary APM Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Migration, APM, Vendor Transition

Description: Build a structured migration playbook for transitioning from proprietary APM tools to OpenTelemetry without losing visibility during the transition.

Migrating from a proprietary APM tool to OpenTelemetry is not a weekend project. It touches every service, every dashboard, and every alerting rule. If you do it wrong, you lose production visibility during the transition. A playbook keeps the migration structured and safe.

## Phase 0: Assessment (2 Weeks)

Before writing any code, understand what you are migrating from:

**Inventory your current state:**

```markdown
## Current APM Inventory

| Category | Count | Details |
|----------|-------|---------|
| Instrumented services | 47 | List in appendix A |
| Custom dashboards | 23 | List in appendix B |
| Active alerts | 89 | Export from current tool |
| Custom metrics | 156 | Scraped from agent configs |
| Transaction traces/day | ~50M | From billing dashboard |
| Monthly APM cost | $X | From finance |
| Contract end date | YYYY-MM-DD | Check with procurement |
```

**Map proprietary concepts to OpenTelemetry:**

Most APM tools have concepts that map directly to OpenTelemetry primitives:

| Proprietary Concept | OpenTelemetry Equivalent |
|---------------------|--------------------------|
| Transaction | Trace |
| Segment | Span |
| Custom attribute | Span attribute |
| Custom metric | OTel metric |
| Error tracking | Span events with exception semantic conventions |
| Service map | Service Graph Connector metrics |

## Phase 1: Parallel Running (4-6 Weeks)

The safest migration strategy is to run both systems simultaneously. Your services send telemetry to both the old APM agent and the new OpenTelemetry SDK.

```python
# During migration, both the old agent and OTel SDK are active
# The old agent continues to work as before
# OTel SDK sends data to your new backend

# Install OTel alongside the existing agent
# pip install opentelemetry-sdk opentelemetry-exporter-otlp

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

def setup_otel():
    """Initialize OTel SDK - runs alongside existing APM agent."""
    provider = TracerProvider()
    provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint="http://otel-collector:4317")
        )
    )
    trace.set_tracer_provider(provider)
```

During this phase, validate that the OpenTelemetry data matches the proprietary tool:

```bash
#!/bin/bash
# Validation script: compare error rates between old and new systems
# Run daily during parallel operation

OLD_ERROR_RATE=$(curl -s "$OLD_APM_API/services/order-service/error-rate?period=24h" \
  | jq '.error_rate')

NEW_ERROR_RATE=$(curl -s "$PROMETHEUS_URL/api/v1/query" \
  --data-urlencode "query=sum(rate(http_server_request_duration_seconds_count{service_name=\"order-service\",http_response_status_code=~\"5..\"}[24h]))/sum(rate(http_server_request_duration_seconds_count{service_name=\"order-service\"}[24h]))" \
  | jq '.data.result[0].value[1]' | tr -d '"')

echo "Old APM error rate: $OLD_ERROR_RATE"
echo "New OTel error rate: $NEW_ERROR_RATE"

# Calculate difference
DIFF=$(python3 -c "print(abs(float('$OLD_ERROR_RATE') - float('$NEW_ERROR_RATE')))")
echo "Difference: $DIFF"

if (( $(echo "$DIFF > 0.01" | bc -l) )); then
  echo "WARNING: Error rates differ by more than 1%"
fi
```

## Phase 2: Dashboard Migration (2-3 Weeks)

Recreate your critical dashboards using OpenTelemetry metrics. Do not try to migrate every dashboard. Focus on:

1. Service health dashboards (error rate, latency, throughput)
2. On-call dashboards referenced by runbooks
3. Business KPI dashboards

Create a migration tracking table:

```markdown
| Dashboard | Old Tool Link | New Dashboard Link | Validated | Owner |
|-----------|--------------|-------------------|-----------|-------|
| Order Service Health | [link] | [link] | Yes | checkout-team |
| Payment Processing | [link] | [link] | No | payments-team |
| System Overview | [link] | In progress | No | platform-team |
```

## Phase 3: Alert Migration (2-3 Weeks)

Migrate alerts after dashboards, because you need working dashboards to validate that alerts fire correctly.

```yaml
# Example: migrating a latency alert from proprietary format to Prometheus

# Old format (proprietary tool):
# alert: order-service-latency
# condition: p95(response_time) > 1500ms for 5 minutes
# notification: pagerduty/checkout-primary

# New format (Prometheus alerting rule):
groups:
  - name: order-service-migrated
    rules:
      - alert: OrderServiceHighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_server_request_duration_seconds_bucket{
              service_name="order-service"
            }[5m])) by (le)
          ) > 1.5
        for: 5m
        labels:
          severity: p2
          team: checkout-team
          migration_source: "old-apm-tool"
        annotations:
          summary: "Order service P95 latency above 1.5s"
          runbook_url: "https://runbooks.internal/order-service-latency"
```

Run migrated alerts in shadow mode first. They evaluate but do not send notifications. Compare their firing patterns with the old alerts:

```python
# Shadow alert comparison script
def compare_alert_firings(old_alerts_api, new_alerts_api, alert_name, period="7d"):
    old_firings = fetch_alert_history(old_alerts_api, alert_name, period)
    new_firings = fetch_alert_history(new_alerts_api, alert_name, period)

    # Compare firing windows
    matched = 0
    for old_firing in old_firings:
        for new_firing in new_firings:
            if abs(old_firing.start - new_firing.start).seconds < 300:
                matched += 1
                break

    match_rate = matched / len(old_firings) if old_firings else 1.0
    print(f"Alert match rate: {match_rate:.0%}")
    print(f"Old firings: {len(old_firings)}, New firings: {len(new_firings)}")
```

## Phase 4: Cutover (1-2 Weeks)

Once you have validated dashboards and alerts, remove the proprietary agent:

1. Start with low-risk services (internal tools, staging environments)
2. Remove the proprietary agent from one service at a time
3. Monitor for gaps in visibility after each removal
4. Wait 48 hours between removals to catch any issues

```bash
# Service cutover checklist
# Run for each service being migrated

SERVICE_NAME="order-service"

echo "Pre-cutover checks for $SERVICE_NAME:"
echo "  [ ] OTel traces visible in new backend"
echo "  [ ] Dashboard shows data from OTel source"
echo "  [ ] Alerts are firing correctly from OTel metrics"
echo "  [ ] Runbooks updated with new query syntax"
echo "  [ ] On-call team notified of cutover date"
echo "  [ ] Rollback plan documented (re-enable old agent)"
```

## Phase 5: Cleanup (Ongoing)

After all services are migrated:

- Remove old APM agent dependencies from all services
- Archive old dashboards (do not delete them immediately)
- Cancel the proprietary tool contract
- Document lessons learned for the next migration

## Common Pitfalls

**Do not underestimate custom instrumentation.** Auto-instrumentation coverage differs between APM vendors and OpenTelemetry. Test thoroughly.

**Do not skip the parallel phase.** Running both systems costs more temporarily but prevents blind spots.

**Do not migrate everything at once.** Pick 2-3 services for the pilot, work out the kinks, then scale.

**Do not forget the human side.** Train your on-call engineers on the new query language and tools before the cutover. An engineer who cannot query traces during an incident is effectively blind.

A migration playbook turns a risky, open-ended project into a series of manageable, reversible steps. Write yours before you start the migration, and update it as you learn.
