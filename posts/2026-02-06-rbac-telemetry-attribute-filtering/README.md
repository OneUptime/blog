# How to Set Up Role-Based Access Control for Telemetry Data Using Collector-Level Attribute Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, RBAC, Access Control, Security

Description: Implement role-based access control for telemetry data by filtering attributes at the Collector level based on team permissions.

Not all teams should see all telemetry data. A team should be able to view their own traces but not another team's sensitive financial data. While most observability backends support some form of access control, implementing filtering at the Collector level provides an additional layer of defense. This post shows how to build RBAC-like controls using Collector pipelines.

## Why Collector-Level Filtering

Backend-level RBAC controls who can query what. But Collector-level filtering controls what data reaches each backend in the first place. This provides defense in depth: even if someone bypasses the query-level controls, they cannot see data that was never stored in their team's partition.

## Architecture

```
All Services -> Shared Agent Collector -> RBAC Gateway Collector
                                              |
                    +-------------------------+------------------+
                    |                         |                  |
             Team A Backend            Team B Backend     Shared Backend
             (only Team A data)       (only Team B data) (aggregated/anonymized)
```

## Gateway Collector Configuration

```yaml
# rbac-gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    send_batch_size: 4096
    timeout: 1s

  # Route telemetry to team-specific pipelines
  routing:
    from_attribute: team.name
    attribute_source: resource
    table:
      - value: payments
        pipelines: [traces/payments, metrics/payments, logs/payments]
      - value: platform
        pipelines: [traces/platform, metrics/platform, logs/platform]
    default_pipelines: [traces/shared, metrics/shared, logs/shared]

  # Strip sensitive attributes before sending to Team A's backend
  # Team A should not see Team B's internal attributes
  attributes/strip_for_payments:
    actions:
      # Keep only attributes relevant to the payments team
      - key: internal.debug.info
        action: delete
      - key: user.session.token
        action: delete
      - key: db.statement
        action: hash  # Hash SQL queries for privacy

  # Strip sensitive attributes for platform team
  attributes/strip_for_platform:
    actions:
      - key: payment.card.last_four
        action: delete
      - key: user.email
        action: delete
      - key: user.phone
        action: delete

  # Anonymize data for the shared/global view
  transform/anonymize:
    trace_statements:
      - context: span
        statements:
          # Replace PII with hashes
          - replace_pattern(attributes["user.id"],
              ".*", SHA256(attributes["user.id"]))
          - delete_key(attributes, "user.email")
          - delete_key(attributes, "user.phone")
          - delete_key(attributes, "user.name")
          # Keep only the domain from email if present
          - replace_pattern(attributes["user.email_domain"],
              ".*@(.*)", "$1")

exporters:
  otlphttp/payments:
    endpoint: https://payments-backend:4318
    headers:
      X-Team: payments

  otlphttp/platform:
    endpoint: https://platform-backend:4318
    headers:
      X-Team: platform

  otlphttp/shared:
    endpoint: https://shared-backend:4318
    headers:
      X-Team: shared

service:
  pipelines:
    # Intake pipeline
    traces:
      receivers: [otlp]
      processors: [batch, routing]
      exporters: []

    # Team-specific pipelines with attribute stripping
    traces/payments:
      receivers: [routing]
      processors: [attributes/strip_for_payments, batch]
      exporters: [otlphttp/payments]

    traces/platform:
      receivers: [routing]
      processors: [attributes/strip_for_platform, batch]
      exporters: [otlphttp/platform]

    traces/shared:
      receivers: [routing]
      processors: [transform/anonymize, batch]
      exporters: [otlphttp/shared]

    # Same pattern for metrics and logs
    metrics/payments:
      receivers: [routing]
      processors: [batch]
      exporters: [otlphttp/payments]

    metrics/platform:
      receivers: [routing]
      processors: [batch]
      exporters: [otlphttp/platform]

    metrics/shared:
      receivers: [routing]
      processors: [batch]
      exporters: [otlphttp/shared]

    logs/payments:
      receivers: [routing]
      processors: [attributes/strip_for_payments, batch]
      exporters: [otlphttp/payments]

    logs/platform:
      receivers: [routing]
      processors: [attributes/strip_for_platform, batch]
      exporters: [otlphttp/platform]

    logs/shared:
      receivers: [routing]
      processors: [transform/anonymize, batch]
      exporters: [otlphttp/shared]
```

## RBAC Configuration as Code

Define the access control rules in a structured format:

```yaml
# rbac-rules.yaml
teams:
  payments:
    # What this team can see
    visible_attributes:
      - "service.name"
      - "http.method"
      - "http.status_code"
      - "http.url"
      - "payment.*"
      - "order.*"
      - "user.id"
    # What gets stripped from their view
    hidden_attributes:
      - "internal.debug.*"
      - "user.session.token"
    # What gets hashed (visible but anonymized)
    hashed_attributes:
      - "db.statement"

  platform:
    visible_attributes:
      - "service.name"
      - "http.method"
      - "http.status_code"
      - "k8s.*"
      - "container.*"
      - "process.*"
    hidden_attributes:
      - "payment.*"
      - "user.email"
      - "user.phone"
    hashed_attributes: []
```

## Generating Collector Config from RBAC Rules

```python
# generate_rbac_config.py
import yaml

def generate_attribute_processor(team_name, rules):
    """Generate Collector attribute processor from RBAC rules."""
    actions = []

    # Delete hidden attributes
    for attr in rules.get("hidden_attributes", []):
        if attr.endswith(".*"):
            # Pattern match - need transform processor instead
            continue
        actions.append({"key": attr, "action": "delete"})

    # Hash specified attributes
    for attr in rules.get("hashed_attributes", []):
        actions.append({"key": attr, "action": "hash"})

    return {
        f"attributes/rbac_{team_name}": {
            "actions": actions
        }
    }

def main():
    with open("rbac-rules.yaml") as f:
        rbac = yaml.safe_load(f)

    processors = {}
    for team_name, rules in rbac["teams"].items():
        proc = generate_attribute_processor(team_name, rules)
        processors.update(proc)

    print(yaml.dump({"processors": processors}, default_flow_style=False))

if __name__ == "__main__":
    main()
```

## Audit Logging

Track all attribute filtering operations for compliance:

```yaml
# Add to the gateway Collector
extensions:
  file_storage:
    directory: /var/log/otel-audit

service:
  extensions: [file_storage]
  telemetry:
    logs:
      level: info
      output_paths: ["/var/log/otel-audit/rbac-gateway.log"]
```

## Wrapping Up

Collector-level RBAC filtering provides defense in depth for telemetry data access. By stripping, hashing, or anonymizing attributes before data reaches team-specific backends, you ensure that even if backend access controls are misconfigured, teams cannot see data they should not have access to. Define your RBAC rules as code, generate the Collector configuration automatically, and audit every filtering decision.
