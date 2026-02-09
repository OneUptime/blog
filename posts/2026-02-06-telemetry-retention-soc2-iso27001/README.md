# How to Implement Telemetry Data Retention Policies That Satisfy SOC 2 and ISO 27001 Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Data Retention, SOC 2, ISO 27001

Description: Implement telemetry data retention policies using OpenTelemetry that satisfy both SOC 2 and ISO 27001 audit requirements.

SOC 2 and ISO 27001 both require that your organization define and enforce data retention policies. SOC 2 Trust Services Criteria CC6.5 addresses logical access to information assets including their disposal, and ISO 27001 Annex A.8.10 covers information deletion. When applied to telemetry data, this means you need a clear policy for how long traces, logs, and metrics are retained, and you need to prove that data is actually deleted when the retention period expires.

Most teams set a blanket 30-day retention and call it done. But compliance frameworks require a more thoughtful approach - different data categories may need different retention periods, and you need the ability to demonstrate enforcement.

## Defining Retention Categories

Not all telemetry data has the same compliance value. Break your telemetry into categories with different retention requirements:

- **Security audit telemetry**: Authentication events, access control decisions, admin actions. SOC 2 typically needs 1 year. ISO 27001 does not specify a duration but requires a documented policy.
- **Operational telemetry**: Performance metrics, error traces, debugging logs. Usually 30-90 days is sufficient.
- **Compliance evidence**: Telemetry that directly serves as compliance evidence (PII redaction metrics, access reviews). Retain for the audit cycle plus one year.
- **Personal data telemetry**: Any telemetry containing personal identifiers. Subject to GDPR/privacy law minimization - keep only as long as necessary.

## Tagging Telemetry with Retention Categories

Use OpenTelemetry resource attributes and span attributes to tag telemetry with its retention category at the point of creation. This lets downstream systems apply the correct retention policy automatically.

Here is how to configure your application services to include retention metadata:

```yaml
# Application deployment with retention metadata
# Set via OTEL_RESOURCE_ATTRIBUTES environment variable
env:
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: >-
      service.name=auth-service,
      retention.category=security_audit,
      retention.days=365,
      data.classification=internal

  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "http://otel-collector:4317"
```

For more granular control, set retention attributes at the span level based on the operation:

```python
# Tag individual spans with retention metadata
from opentelemetry import trace

tracer = trace.get_tracer("auth-service")

def handle_login(request):
    with tracer.start_as_current_span("user.login") as span:
        # Security events get long retention
        span.set_attribute("retention.category", "security_audit")
        span.set_attribute("retention.days", 365)
        span.set_attribute("retention.reason", "soc2_cc6.1")

        result = authenticate(request)
        span.set_attribute("auth.outcome", result.status)
        return result

def handle_health_check(request):
    with tracer.start_as_current_span("health.check") as span:
        # Operational health checks get short retention
        span.set_attribute("retention.category", "operational")
        span.set_attribute("retention.days", 7)
        return check_health()
```

## Collector-Level Retention Routing

Configure the OpenTelemetry Collector to route telemetry to different backends (or different indices within the same backend) based on the retention category. This is the enforcement layer.

This collector config routes telemetry to different storage tiers based on retention requirements:

```yaml
# retention-routing-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  routing/retention:
    table:
      # Security audit data - 365 day retention backend
      - statement: route()
          where resource.attributes["retention.category"] == "security_audit"
        pipelines: [traces/long_retention, logs/long_retention]

      # Compliance evidence - 730 day retention
      - statement: route()
          where resource.attributes["retention.category"] == "compliance_evidence"
        pipelines: [traces/compliance, logs/compliance]

      # Personal data - 30 day retention (data minimization)
      - statement: route()
          where resource.attributes["retention.category"] == "personal_data"
        pipelines: [traces/short_retention, logs/short_retention]

    # Default - operational data, 90 day retention
    default_pipelines: [traces/default, logs/default]

processors:
  batch/fast:
    timeout: 5s
    send_batch_size: 500

  batch/slow:
    timeout: 30s
    send_batch_size: 2000

  # Add retention metadata for backend enforcement
  attributes/retention_365:
    actions:
      - key: retention.enforced_days
        value: "365"
        action: upsert
      - key: retention.tier
        value: "long"
        action: upsert

  attributes/retention_90:
    actions:
      - key: retention.enforced_days
        value: "90"
        action: upsert
      - key: retention.tier
        value: "standard"
        action: upsert

  attributes/retention_30:
    actions:
      - key: retention.enforced_days
        value: "30"
        action: upsert
      - key: retention.tier
        value: "short"
        action: upsert

exporters:
  # Long retention backend (365 days)
  otlp/long:
    endpoint: https://telemetry-archive.internal:4317
    headers:
      X-Retention-Days: "365"

  # Standard retention backend (90 days)
  otlp/standard:
    endpoint: https://telemetry.internal:4317
    headers:
      X-Retention-Days: "90"

  # Short retention backend (30 days, personal data)
  otlp/short:
    endpoint: https://telemetry-ephemeral.internal:4317
    headers:
      X-Retention-Days: "30"

  # Compliance evidence store (730 days)
  otlp/compliance:
    endpoint: https://compliance-evidence.internal:4317
    headers:
      X-Retention-Days: "730"

service:
  pipelines:
    traces/ingress:
      receivers: [otlp]
      exporters: [routing/retention]

    logs/ingress:
      receivers: [otlp]
      exporters: [routing/retention]

    traces/long_retention:
      receivers: [routing/retention]
      processors: [attributes/retention_365, batch/slow]
      exporters: [otlp/long]

    traces/default:
      receivers: [routing/retention]
      processors: [attributes/retention_90, batch/fast]
      exporters: [otlp/standard]

    traces/short_retention:
      receivers: [routing/retention]
      processors: [attributes/retention_30, batch/fast]
      exporters: [otlp/short]

    traces/compliance:
      receivers: [routing/retention]
      processors: [attributes/retention_365, batch/slow]
      exporters: [otlp/compliance]

    logs/long_retention:
      receivers: [routing/retention]
      processors: [attributes/retention_365, batch/slow]
      exporters: [otlp/long]

    logs/default:
      receivers: [routing/retention]
      processors: [attributes/retention_90, batch/fast]
      exporters: [otlp/standard]

    logs/short_retention:
      receivers: [routing/retention]
      processors: [attributes/retention_30, batch/fast]
      exporters: [otlp/short]

    logs/compliance:
      receivers: [routing/retention]
      processors: [attributes/retention_365, batch/slow]
      exporters: [otlp/compliance]
```

## Automating Retention Enforcement

Routing telemetry to different backends is only half the battle. You also need to enforce deletion when the retention period expires. Here is a script that validates retention enforcement and generates audit evidence:

```python
# Retention enforcement validation script
# Run daily via cron to verify data is being deleted on schedule
import requests
from datetime import datetime, timedelta

RETENTION_TIERS = {
    "short": {"days": 30, "backend": "telemetry-ephemeral.internal"},
    "standard": {"days": 90, "backend": "telemetry.internal"},
    "long": {"days": 365, "backend": "telemetry-archive.internal"},
    "compliance": {"days": 730, "backend": "compliance-evidence.internal"},
}

def check_retention_enforcement():
    """Verify that data older than the retention period has been deleted."""
    results = []

    for tier_name, config in RETENTION_TIERS.items():
        retention_days = config["days"]
        backend = config["backend"]

        # Query for data older than the retention period
        cutoff = datetime.utcnow() - timedelta(days=retention_days + 1)

        response = requests.get(
            f"https://{backend}:4318/api/v1/count",
            params={
                "start": "2020-01-01T00:00:00Z",
                "end": cutoff.isoformat() + "Z",
            },
            verify="/etc/ssl/certs/ca-bundle.crt",
        )

        count = response.json().get("count", -1)
        compliant = count == 0

        results.append({
            "tier": tier_name,
            "retention_days": retention_days,
            "records_past_retention": count,
            "compliant": compliant,
            "checked_at": datetime.utcnow().isoformat(),
        })

        if not compliant:
            # Alert the compliance team
            send_alert(
                f"RETENTION VIOLATION: {count} records in "
                f"{tier_name} tier are past {retention_days}-day retention"
            )

    # Write audit evidence
    write_audit_report(results)
    return results


def write_audit_report(results):
    """Generate a retention compliance report for auditors."""
    report_date = datetime.utcnow().strftime("%Y-%m-%d")
    report = {
        "report_type": "retention_compliance",
        "report_date": report_date,
        "framework": ["SOC2-CC6.5", "ISO27001-A.8.10"],
        "results": results,
        "all_compliant": all(r["compliant"] for r in results),
    }
    # Store the report in your compliance evidence repository
    save_compliance_evidence(report)
```

## Documenting Your Retention Policy

Both SOC 2 and ISO 27001 require a documented retention policy. Your policy document should include:

1. **Retention schedule**: A table mapping each data category to its retention period with justification
2. **Enforcement mechanism**: Description of how the OpenTelemetry Collector routes data to the correct tier
3. **Verification process**: How you validate that deletion actually happens (the script above)
4. **Exception process**: How to request extended retention for specific data (e.g., legal hold)
5. **Review cadence**: How often the policy is reviewed and by whom

## Handling Legal Holds

Sometimes you need to suspend retention policies for specific data related to litigation or investigation. Build this into your pipeline with a legal hold flag:

```python
# Check for legal hold before applying retention deletion
def should_delete(record, tier_config):
    """Determine if a record should be deleted based on retention policy."""
    # Never delete records under legal hold
    if record.attributes.get("legal_hold") == "true":
        return False

    age_days = (datetime.utcnow() - record.timestamp).days
    return age_days > tier_config["days"]
```

## Conclusion

Implementing telemetry retention policies that satisfy both SOC 2 and ISO 27001 requires three things: categorizing your telemetry data by compliance value, routing it to storage tiers with appropriate retention periods using the OpenTelemetry Collector, and continuously validating that deletion is actually happening. The retention routing collector configuration handles the enforcement, and the daily validation script generates the audit evidence that proves your policy is working. Document the policy, automate the enforcement, verify the results, and your auditors will have everything they need.
