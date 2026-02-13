# How to Configure the Lookup Processor in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Processors, Lookup, Enrichment, Attributes

Description: Learn how to configure the Lookup processor in OpenTelemetry Collector to enrich telemetry data with external reference information for enhanced observability.

The Lookup processor enriches telemetry data by matching attribute values against external reference sources and adding corresponding metadata. This capability transforms raw telemetry into contextually rich data that provides deeper insights into application behavior, infrastructure state, and business metrics.

## Why Enrichment Matters

Raw telemetry often contains identifiers like service names, host IDs, or customer IDs without additional context. The Lookup processor bridges this gap by correlating these identifiers with descriptive metadata, enabling:

- Associating service names with team ownership and escalation contacts
- Mapping host identifiers to datacenter locations and hardware specifications
- Linking customer IDs to subscription tiers and feature flags
- Correlating request IDs with transaction values and business outcomes

This enrichment happens at collection time, ensuring all downstream systems receive contextually complete data without requiring separate lookup operations.

## Core Concepts

The Lookup processor operates on a simple principle: match an attribute value in incoming telemetry against a lookup table, and when a match occurs, add associated attributes to the telemetry data.

```mermaid
graph LR
    A[Incoming Span] -->|service.name=api| B[Lookup Processor]
    C[Lookup Table] -->|api → team=backend, oncall=alice| B
    B -->|service.name=api<br/>team=backend<br/>oncall=alice| D[Enriched Span]

    style B fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#bbf,stroke:#333,stroke-width:2px
    style D fill:#9f9,stroke:#333,stroke-width:2px
```

The processor supports multiple lookup sources:
- Static configuration in the collector config file
- External CSV files
- External JSON files
- Environment variables

## Basic Configuration

Start with a simple static lookup configuration that enriches service names with team information.

```yaml
# Basic Lookup processor configuration
processors:
  lookup:
    # Define the lookup table name
    lookup_table:
      # Static mapping of service names to team information
      api:
        team: backend
        oncall: alice@example.com
      web:
        team: frontend
        oncall: bob@example.com
      auth:
        team: security
        oncall: charlie@example.com

    # Configure the lookup operation
    lookups:
      # Match on the service.name attribute
      - attribute: service.name
        # Use the lookup_table defined above
        table: lookup_table

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [lookup, batch]
      exporters: [otlp]
```

With this configuration, any span with `service.name=api` will automatically receive `team=backend` and `oncall=alice@example.com` attributes.

## CSV File Lookups

For larger datasets or when lookup data needs frequent updates without collector restarts, use external CSV files.

First, create a CSV file at `/etc/otel-collector/service-metadata.csv`:

```csv
service_name,team,oncall,environment,slack_channel
api,backend,alice@example.com,production,#backend-alerts
web,frontend,bob@example.com,production,#frontend-alerts
auth,security,charlie@example.com,production,#security-alerts
analytics,data,david@example.com,production,#data-alerts
```

Then configure the processor to use this file:

```yaml
# CSV file lookup configuration
processors:
  lookup:
    # Define lookup table from CSV file
    csv_file:
      path: /etc/otel-collector/service-metadata.csv
      # Specify the key column for matching
      key_column: service_name

    # Configure lookup operation
    lookups:
      # Match service.name against the service_name column
      - attribute: service.name
        # Use CSV file as lookup source
        source: csv_file

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [lookup, batch]
      exporters: [otlp]
```

The processor reads the CSV file at startup and performs lookups in memory, ensuring minimal performance impact.

## JSON File Lookups

JSON files provide more flexibility for complex nested structures and hierarchical data.

Create `/etc/otel-collector/host-metadata.json`:

```json
{
  "host-001": {
    "datacenter": "us-east-1",
    "zone": "us-east-1a",
    "instance_type": "c5.xlarge",
    "cost_center": "engineering",
    "tags": {
      "environment": "production",
      "managed_by": "terraform"
    }
  },
  "host-002": {
    "datacenter": "us-west-2",
    "zone": "us-west-2b",
    "instance_type": "c5.2xlarge",
    "cost_center": "engineering",
    "tags": {
      "environment": "production",
      "managed_by": "terraform"
    }
  }
}
```

Configure the processor to use this JSON file:

```yaml
# JSON file lookup configuration
processors:
  lookup:
    # Define lookup table from JSON file
    json_file:
      path: /etc/otel-collector/host-metadata.json

    # Configure lookup operation
    lookups:
      # Match host.id against JSON keys
      - attribute: host.id
        source: json_file
        # Flatten nested JSON into individual attributes
        flatten: true
        # Optional: prefix for added attributes
        prefix: host.metadata.

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [lookup, batch]
      exporters: [otlp]
```

With `flatten: true`, nested JSON structures become individual attributes:
- `host.metadata.datacenter=us-east-1`
- `host.metadata.zone=us-east-1a`
- `host.metadata.instance_type=c5.xlarge`
- `host.metadata.tags.environment=production`

## Multiple Lookup Tables

Complex scenarios often require multiple lookup operations against different tables. The processor supports this through multiple lookup configurations.

```yaml
# Multiple lookup tables configuration
processors:
  lookup:
    # Define multiple lookup tables
    tables:
      # Service metadata table
      services:
        api:
          team: backend
          repo: github.com/example/api
        web:
          team: frontend
          repo: github.com/example/web

      # Environment configuration table
      environments:
        prod:
          alert_threshold: 0.95
          sample_rate: 0.1
        staging:
          alert_threshold: 0.90
          sample_rate: 0.5
        dev:
          alert_threshold: 0.80
          sample_rate: 1.0

    # Configure multiple lookup operations
    lookups:
      # Lookup service metadata
      - attribute: service.name
        table: services

      # Lookup environment configuration
      - attribute: deployment.environment
        table: environments

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [lookup, batch]
      exporters: [otlp]
```

The processor applies lookups sequentially, enriching telemetry with data from multiple sources.

## Conditional Lookups

Apply lookups only when specific conditions are met, avoiding unnecessary enrichment or handling special cases.

```yaml
# Conditional lookup configuration
processors:
  lookup:
    tables:
      premium_customers:
        cust-123:
          tier: platinum
          support_level: 24x7
        cust-456:
          tier: gold
          support_level: business_hours

    lookups:
      # Only lookup customer metadata for premium tiers
      - attribute: customer.id
        table: premium_customers
        # Only apply if customer.tier attribute exists
        condition: attributes["customer.tier"] != nil

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [lookup, batch]
      exporters: [otlp]
```

This prevents lookup operations on non-premium customers, improving performance and reducing noise in telemetry data.

## Dynamic File Reloading

For production environments where lookup data changes frequently, enable automatic file reloading to pick up changes without collector restarts.

```yaml
# Dynamic file reloading configuration
processors:
  lookup:
    # CSV file with automatic reloading
    csv_file:
      path: /etc/otel-collector/service-metadata.csv
      key_column: service_name
      # Reload file every 5 minutes
      reload_interval: 5m

    lookups:
      - attribute: service.name
        source: csv_file

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [lookup, batch]
      exporters: [otlp]
```

The processor monitors the file and reloads it at the specified interval, ensuring lookup data stays current.

## Handling Missing Lookups

Configure how the processor handles cases where no matching lookup entry exists.

```yaml
# Missing lookup handling configuration
processors:
  lookup:
    tables:
      known_services:
        api:
          team: backend
        web:
          team: frontend

    lookups:
      - attribute: service.name
        table: known_services
        # Set default values when no match found
        default:
          team: unknown
          oncall: oncall@example.com
        # Optional: add a flag indicating lookup success
        add_match_flag: true
        match_flag_attribute: lookup.matched

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [lookup, batch]
      exporters: [otlp]
```

When a span with `service.name=unknown-service` arrives:
- `team=unknown` (from default)
- `oncall=oncall@example.com` (from default)
- `lookup.matched=false` (indicates no matching entry found)

## Complex Pipeline Integration

Integrate the Lookup processor with other processors for comprehensive telemetry enrichment.

```yaml
# Complex pipeline with multiple processors
processors:
  # Extract relevant attributes first
  attributes/extract:
    actions:
      # Extract service name from span name
      - key: service.name
        pattern: ^([^/]+)/.*
        action: extract

  # Enrich with service metadata
  lookup/services:
    csv_file:
      path: /etc/otel-collector/services.csv
      key_column: service_name
      reload_interval: 5m
    lookups:
      - attribute: service.name
        source: csv_file

  # Enrich with host metadata
  lookup/hosts:
    json_file:
      path: /etc/otel-collector/hosts.json
      reload_interval: 10m
    lookups:
      - attribute: host.id
        source: json_file
        flatten: true
        prefix: host.

  # Add resource attributes
  resource:
    attributes:
      - key: collector.version
        value: "1.0.0"
        action: insert

  # Filter based on enriched attributes
  filter/by_team:
    traces:
      span:
        # Only keep spans from known teams
        - attributes["team"] != "unknown"

  # Batch for efficiency
  batch:
    timeout: 10s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - attributes/extract
        - lookup/services
        - lookup/hosts
        - resource
        - filter/by_team
        - batch
      exporters: [otlp]
```

This pipeline demonstrates a complete enrichment workflow:
1. Extracts service name from span name
2. Enriches with service metadata from CSV
3. Enriches with host metadata from JSON
4. Adds resource attributes
5. Filters based on enriched data
6. Batches for transmission

## Use Cases

### Service Ownership Mapping

Automatically route alerts and notifications to the correct teams:

```yaml
processors:
  lookup:
    csv_file:
      path: /etc/otel-collector/service-owners.csv
      key_column: service
    lookups:
      - attribute: service.name
        source: csv_file

# service-owners.csv content:
# service,team,slack_channel,pagerduty_key
# api,backend,#backend-alerts,PXXXXXXX
# web,frontend,#frontend-alerts,PYYYYYY
```

### Cost Allocation

Track cloud costs by mapping resources to cost centers:

```yaml
processors:
  lookup:
    json_file:
      path: /etc/otel-collector/cost-centers.json
    lookups:
      - attribute: cloud.resource.id
        source: json_file

# cost-centers.json content:
# {
#   "i-abc123": {"cost_center": "engineering", "project": "api"},
#   "i-def456": {"cost_center": "marketing", "project": "web"}
# }
```

### Customer Segmentation

Enrich customer interactions with tier and feature access:

```yaml
processors:
  lookup:
    tables:
      customer_tiers:
        cust-001:
          tier: enterprise
          features: ["advanced_analytics", "priority_support"]
        cust-002:
          tier: starter
          features: ["basic_features"]
    lookups:
      - attribute: customer.id
        table: customer_tiers
```

## Performance Optimization

The Lookup processor loads lookup tables into memory for fast matching. For large lookup tables:

1. **Use indexed formats**: CSV and JSON files are indexed on load for O(1) lookup performance.

2. **Monitor memory usage**: Each lookup table consumes memory proportional to its size. For very large tables (millions of entries), consider external enrichment services.

3. **Reload interval tuning**: Balance between data freshness and reload overhead. Longer intervals reduce CPU and disk I/O.

```yaml
# Performance-optimized configuration
processors:
  lookup:
    csv_file:
      path: /etc/otel-collector/large-dataset.csv
      key_column: id
      # Reload only once per hour for large files
      reload_interval: 1h
      # Optional: cache size limit
      max_entries: 100000
    lookups:
      - attribute: resource.id
        source: csv_file
```

## Troubleshooting

**Lookups not applying**: Verify the attribute name matches exactly (case-sensitive). Check that the lookup table contains matching keys.

**File not found errors**: Ensure file paths are absolute and the collector process has read permissions.

**Memory usage growing**: Large lookup tables consume memory. Monitor usage and consider splitting into multiple smaller tables or using external services.

**Stale data after file updates**: Verify `reload_interval` is configured. Without it, files are loaded only at startup.

## Security Considerations

Lookup files may contain sensitive information like oncall contacts or cost center data. Secure these files:

1. **File permissions**: Restrict read access to the collector process user
2. **Sensitive data**: Avoid storing secrets in lookup tables; use secret management systems instead
3. **Audit logging**: Monitor access to lookup files
4. **Encryption**: Encrypt lookup files at rest if they contain PII

## Related Resources

For more information on enriching and transforming telemetry data:

- [How to Write OTTL Statements for the Transform Processor](https://oneuptime.com/blog/post/2026-02-06-ottl-statements-transform-processor-opentelemetry-collector/view)
- [How to Use the Metrics Start Time Processor](https://oneuptime.com/blog/post/2026-02-06-metrics-start-time-processor-opentelemetry-collector/view)

The Lookup processor transforms raw telemetry into contextually rich data by correlating identifiers with external metadata. Whether mapping services to teams, resources to cost centers, or customers to subscription tiers, the processor provides essential enrichment capabilities that enhance observability and enable data-driven decision making. Configure appropriate reload intervals for production deployments, monitor memory usage with large lookup tables, and secure sensitive lookup data appropriately.
