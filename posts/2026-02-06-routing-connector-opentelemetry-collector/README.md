# How to Configure the Routing Connector in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Connectors, Routing, Traffic Management, Multi-tenancy

Description: Master the Routing Connector in OpenTelemetry Collector to intelligently route telemetry data to different backends based on attributes, enabling multi-tenancy and advanced traffic management.

The Routing Connector in the OpenTelemetry Collector enables intelligent routing of telemetry data based on resource attributes, span attributes, or other telemetry properties. This capability is essential for multi-tenant environments, cost optimization, and implementing sophisticated observability architectures.

## Why Route Telemetry Data

Modern observability platforms often need to route different types of telemetry to different destinations. Common scenarios include:

- **Multi-tenancy**: Route data from different customers or teams to separate backends
- **Cost optimization**: Send high-value data to expensive storage and low-value data to cheaper alternatives
- **Compliance**: Route sensitive data to compliant storage while sending non-sensitive data elsewhere
- **Data tiering**: Send real-time data to fast storage and historical data to long-term storage
- **Specialized backends**: Route specific telemetry types to specialized analysis tools

The Routing Connector makes these scenarios possible without changing application instrumentation.

## How the Routing Connector Works

The Routing Connector examines attributes on incoming telemetry and routes data to exporters based on matching rules:

```mermaid
graph TB
    A[Incoming Telemetry] --> B[Routing Connector]
    B --> C{Evaluate Attribute}
    C -->|tenant=customer-a| D[Exporter A]
    C -->|tenant=customer-b| E[Exporter B]
    C -->|environment=prod| F[Exporter C]
    C -->|No Match| G[Default Exporter]
    D --> H[Backend A]
    E --> I[Backend B]
    F --> J[Backend C]
    G --> K[Default Backend]
```

The connector evaluates routing rules in order and sends telemetry to the first matching exporter. If no rules match, it uses a default exporter or drops the data.

## Basic Configuration

Here's a simple routing configuration based on the service name attribute:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  # Backend for service A
  otlp/service-a:
    endpoint: backend-a.example.com:4317

  # Backend for service B
  otlp/service-b:
    endpoint: backend-b.example.com:4317

  # Default backend for all other services
  otlp/default:
    endpoint: default-backend.example.com:4317

connectors:
  routing:
    # Attribute to use for routing decisions
    from_attribute: service.name
    # Default exporters if no match is found
    default_exporters:
      - otlp/default

    # Routing table mapping attribute values to exporters
    table:
      - value: service-a
        exporters:
          - otlp/service-a
      - value: service-b
        exporters:
          - otlp/service-b

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      # Use routing connector instead of direct exporters
      exporters: [routing]
```

This configuration routes traces from "service-a" to one backend, "service-b" to another, and everything else to the default backend.

## Multi-Tenant Routing

Implement multi-tenancy by routing data based on tenant identifiers:

```yaml
processors:
  # Extract tenant ID from authentication headers or attributes
  resource:
    attributes:
      - key: tenant.id
        from_attribute: http.request.header.x-tenant-id
        action: upsert

exporters:
  # Tenant-specific backends
  otlp/tenant-gold:
    endpoint: gold-tier.example.com:4317
    # Gold tier gets better SLA

  otlp/tenant-silver:
    endpoint: silver-tier.example.com:4317

  otlp/tenant-bronze:
    endpoint: bronze-tier.example.com:4317

  # Catch-all for unknown tenants
  otlp/unknown:
    endpoint: unknown-tenant.example.com:4317

connectors:
  routing:
    from_attribute: tenant.id
    default_exporters:
      - otlp/unknown

    table:
      # Gold tier customers
      - value: tenant-001
        exporters: [otlp/tenant-gold]
      - value: tenant-002
        exporters: [otlp/tenant-gold]

      # Silver tier customers
      - value: tenant-003
        exporters: [otlp/tenant-silver]
      - value: tenant-004
        exporters: [otlp/tenant-silver]

      # Bronze tier customers
      - value: tenant-005
        exporters: [otlp/tenant-bronze]
      - value: tenant-006
        exporters: [otlp/tenant-bronze]

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [routing]

    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [routing]

    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [routing]
```

## Environment-Based Routing

Route telemetry from different environments to appropriate backends:

```yaml
exporters:
  # Production backend with high availability
  otlp/production:
    endpoint: prod.observability.example.com:4317
    timeout: 5s
    compression: gzip
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s

  # Staging backend
  otlp/staging:
    endpoint: staging.observability.example.com:4317
    timeout: 10s

  # Development backend (may be less reliable)
  otlp/development:
    endpoint: dev.observability.example.com:4317
    timeout: 15s

  # Testing environment
  otlp/testing:
    endpoint: test.observability.example.com:4317
    timeout: 10s

connectors:
  routing:
    from_attribute: deployment.environment
    default_exporters:
      - otlp/development

    table:
      - value: production
        exporters: [otlp/production]
      - value: prod
        exporters: [otlp/production]

      - value: staging
        exporters: [otlp/staging]
      - value: stage
        exporters: [otlp/staging]

      - value: testing
        exporters: [otlp/testing]
      - value: test
        exporters: [otlp/testing]

      - value: development
        exporters: [otlp/development]
      - value: dev
        exporters: [otlp/development]

processors:
  # Ensure deployment.environment attribute exists
  resource:
    attributes:
      - key: deployment.environment
        value: ${ENVIRONMENT:-development}
        action: insert

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [routing]

    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [routing]

    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [routing]
```

## Cost-Optimized Routing

Route high-value and low-value telemetry to different storage tiers:

```yaml
processors:
  # Classify telemetry by value
  transform:
    trace_statements:
      - context: span
        statements:
          # Mark production errors as high value
          - set(attributes["telemetry.tier"], "high-value") where resource.attributes["deployment.environment"] == "production" and status.code == STATUS_CODE_ERROR

          # Mark production traces as medium value
          - set(attributes["telemetry.tier"], "medium-value") where resource.attributes["deployment.environment"] == "production" and attributes["telemetry.tier"] == nil

          # Everything else is low value
          - set(attributes["telemetry.tier"], "low-value") where attributes["telemetry.tier"] == nil

exporters:
  # Premium backend for high-value data (expensive, fast)
  otlp/premium:
    endpoint: premium.example.com:4317
    timeout: 5s

  # Standard backend for medium-value data
  otlp/standard:
    endpoint: standard.example.com:4317
    timeout: 10s

  # Archive backend for low-value data (cheap, slow)
  otlp/archive:
    endpoint: archive.example.com:4317
    timeout: 30s

connectors:
  routing:
    from_attribute: telemetry.tier
    default_exporters:
      - otlp/standard

    table:
      - value: high-value
        exporters: [otlp/premium]

      - value: medium-value
        exporters: [otlp/standard]

      - value: low-value
        exporters: [otlp/archive]

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform, batch]
      exporters: [routing]
```

## Geographic Routing

Route telemetry based on geographic location to comply with data residency requirements:

```yaml
processors:
  # Add region information if not present
  resource:
    attributes:
      - key: cloud.region
        value: ${CLOUD_REGION}
        action: insert

exporters:
  # Regional backends
  otlp/us-east:
    endpoint: us-east.example.com:4317
  otlp/us-west:
    endpoint: us-west.example.com:4317
  otlp/eu-west:
    endpoint: eu-west.example.com:4317
  otlp/eu-central:
    endpoint: eu-central.example.com:4317
  otlp/ap-southeast:
    endpoint: ap-southeast.example.com:4317

  # Default to nearest region
  otlp/default:
    endpoint: global.example.com:4317

connectors:
  routing:
    from_attribute: cloud.region
    default_exporters:
      - otlp/default

    table:
      # US regions
      - value: us-east-1
        exporters: [otlp/us-east]
      - value: us-east-2
        exporters: [otlp/us-east]
      - value: us-west-1
        exporters: [otlp/us-west]
      - value: us-west-2
        exporters: [otlp/us-west]

      # European regions
      - value: eu-west-1
        exporters: [otlp/eu-west]
      - value: eu-west-2
        exporters: [otlp/eu-west]
      - value: eu-central-1
        exporters: [otlp/eu-central]

      # Asia Pacific regions
      - value: ap-southeast-1
        exporters: [otlp/ap-southeast]
      - value: ap-southeast-2
        exporters: [otlp/ap-southeast]

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [routing]

    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [routing]

    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [routing]
```

## Multiple Routing Stages

Implement cascading routing decisions with multiple routing connectors:

```yaml
exporters:
  # Production backends by team
  otlp/prod-team-a:
    endpoint: prod-team-a.example.com:4317
  otlp/prod-team-b:
    endpoint: prod-team-b.example.com:4317

  # Non-production backends by team
  otlp/nonprod-team-a:
    endpoint: nonprod-team-a.example.com:4317
  otlp/nonprod-team-b:
    endpoint: nonprod-team-b.example.com:4317

  # Default backends
  otlp/prod-default:
    endpoint: prod-default.example.com:4317
  otlp/nonprod-default:
    endpoint: nonprod-default.example.com:4317

connectors:
  # First stage: Route by environment
  routing/environment:
    from_attribute: deployment.environment
    default_exporters:
      - routing/nonprod-teams

    table:
      - value: production
        exporters: [routing/prod-teams]
      - value: staging
        exporters: [routing/nonprod-teams]
      - value: development
        exporters: [routing/nonprod-teams]

  # Second stage: Route production by team
  routing/prod-teams:
    from_attribute: team.name
    default_exporters:
      - otlp/prod-default

    table:
      - value: team-a
        exporters: [otlp/prod-team-a]
      - value: team-b
        exporters: [otlp/prod-team-b]

  # Second stage: Route non-production by team
  routing/nonprod-teams:
    from_attribute: team.name
    default_exporters:
      - otlp/nonprod-default

    table:
      - value: team-a
        exporters: [otlp/nonprod-team-a]
      - value: team-b
        exporters: [otlp/nonprod-team-b]

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      # Start with environment routing
      exporters: [routing/environment]
```

## Routing with Sampling

Combine routing with sampling for cost-effective observability:

```yaml
processors:
  # Sample based on environment
  probabilistic_sampler/dev:
    sampling_percentage: 5.0  # 5% of dev traffic

  probabilistic_sampler/staging:
    sampling_percentage: 25.0  # 25% of staging traffic

  # No sampling for production

exporters:
  otlp/production:
    endpoint: prod-backend.example.com:4317

  otlp/staging:
    endpoint: staging-backend.example.com:4317

  otlp/development:
    endpoint: dev-backend.example.com:4317

connectors:
  routing:
    from_attribute: deployment.environment
    default_exporters:
      - otlp/development

    table:
      - value: production
        exporters: [otlp/production]

      - value: staging
        exporters: [otlp/staging]

      - value: development
        exporters: [otlp/development]

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [routing]

    # Separate pipelines with sampling for non-production
    traces/staging:
      receivers: [routing]
      processors: [probabilistic_sampler/staging, batch]
      exporters: [otlp/staging]

    traces/development:
      receivers: [routing]
      processors: [probabilistic_sampler/dev, batch]
      exporters: [otlp/development]
```

## Routing to Multiple Destinations

Send telemetry to multiple backends simultaneously based on routing rules:

```yaml
exporters:
  # Primary backend
  otlp/primary:
    endpoint: primary.example.com:4317

  # Analytics backend
  otlp/analytics:
    endpoint: analytics.example.com:4317

  # Security monitoring backend
  otlp/security:
    endpoint: security.example.com:4317

  # Compliance audit backend
  otlp/audit:
    endpoint: audit.example.com:4317

connectors:
  # Route by service type
  routing/service-type:
    from_attribute: service.type
    default_exporters:
      - otlp/primary

    table:
      # API services go to primary and analytics
      - value: api
        exporters:
          - otlp/primary
          - otlp/analytics

      # Auth services go to primary, security, and audit
      - value: authentication
        exporters:
          - otlp/primary
          - otlp/security
          - otlp/audit

      # Payment services go to all backends
      - value: payment
        exporters:
          - otlp/primary
          - otlp/analytics
          - otlp/security
          - otlp/audit

      # Background jobs go to primary only
      - value: worker
        exporters:
          - otlp/primary

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

  # Tag services by type
  resource:
    attributes:
      - key: service.type
        value: ${SERVICE_TYPE}
        action: upsert

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [routing/service-type]
```

## Production-Ready Configuration

Here's a comprehensive production configuration with routing, failover, and monitoring:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024

  batch:
    timeout: 10s
    send_batch_size: 1024

  resource/metadata:
    attributes:
      - key: collector.name
        value: ${COLLECTOR_NAME}
        action: upsert
      - key: collector.version
        value: ${COLLECTOR_VERSION}
        action: upsert

  # Classify telemetry
  transform:
    trace_statements:
      - context: resource
        statements:
          # Ensure tenant ID exists
          - set(attributes["tenant.id"], "unknown") where attributes["tenant.id"] == nil

exporters:
  # Tenant-specific backends with failover
  otlp/tenant-premium:
    endpoint: ${PREMIUM_BACKEND}
    timeout: 5s
    compression: gzip

  otlp/tenant-standard:
    endpoint: ${STANDARD_BACKEND}
    timeout: 10s
    compression: gzip

  otlp/tenant-basic:
    endpoint: ${BASIC_BACKEND}
    timeout: 10s

  # Default backend
  otlp/default:
    endpoint: ${DEFAULT_BACKEND}
    timeout: 10s

  # Monitoring
  prometheus:
    endpoint: 0.0.0.0:8889

connectors:
  routing:
    from_attribute: tenant.id
    default_exporters:
      - otlp/default

    table:
      # Premium tenants (SLA: 99.99%)
      - value: tenant-premium-001
        exporters: [otlp/tenant-premium]
      - value: tenant-premium-002
        exporters: [otlp/tenant-premium]

      # Standard tenants (SLA: 99.9%)
      - value: tenant-standard-001
        exporters: [otlp/tenant-standard]
      - value: tenant-standard-002
        exporters: [otlp/tenant-standard]
      - value: tenant-standard-003
        exporters: [otlp/tenant-standard]

      # Basic tenants (SLA: 99%)
      - value: tenant-basic-001
        exporters: [otlp/tenant-basic]
      - value: tenant-basic-002
        exporters: [otlp/tenant-basic]
      - value: tenant-basic-003
        exporters: [otlp/tenant-basic]

service:
  telemetry:
    logs:
      level: ${LOG_LEVEL:-info}
      encoding: json

    metrics:
      level: detailed
      address: 0.0.0.0:8888

  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - memory_limiter
        - resource/metadata
        - transform
        - batch
      exporters: [routing]

    metrics:
      receivers: [otlp]
      processors:
        - memory_limiter
        - resource/metadata
        - batch
      exporters: [routing]

    logs:
      receivers: [otlp]
      processors:
        - memory_limiter
        - resource/metadata
        - batch
      exporters: [routing]
```

## Monitoring Routing Decisions

Track routing behavior to understand traffic patterns and identify issues:

```yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888

    logs:
      level: info
      # Log routing decisions
```

Key metrics to monitor:
- `otelcol_connector_accepted_spans`: Spans accepted by routing connector
- `otelcol_connector_refused_spans`: Spans refused due to routing errors
- `otelcol_exporter_sent_spans`: Spans sent to each destination exporter

## Integration with Other Connectors

The Routing Connector works well with other connectors. Combine it with the Failover Connector at https://oneuptime.com/blog/post/2026-02-06-failover-connector-opentelemetry-collector/view for resilient multi-tenant routing, or use it alongside the Count Connector at https://oneuptime.com/blog/post/2026-02-06-count-connector-opentelemetry-collector/view to track routing patterns.

## Best Practices

1. **Use Resource Attributes for Routing**: Resource attributes are more reliable than span attributes for routing decisions.

2. **Provide Default Exporters**: Always configure default exporters to handle unmatched telemetry gracefully.

3. **Validate Routing Attributes**: Ensure routing attributes are present before the routing connector processes data.

4. **Monitor Routing Distribution**: Track which exporters receive the most traffic to identify imbalances.

5. **Test Routing Rules**: Validate routing behavior in non-production environments before deploying.

6. **Document Routing Logic**: Maintain clear documentation of routing rules and their business justification.

7. **Minimize Routing Stages**: Excessive cascading routing can impact performance and increase complexity.

8. **Use Consistent Attribute Names**: Standardize attribute names across your organization for easier routing configuration.

## Conclusion

The Routing Connector transforms the OpenTelemetry Collector into an intelligent traffic manager, enabling sophisticated routing strategies without changing application code. Whether implementing multi-tenancy, optimizing costs, or meeting compliance requirements, the Routing Connector provides the flexibility to route telemetry exactly where it needs to go.

Start with simple routing rules based on environment or service name, then gradually build more sophisticated routing logic as your observability architecture evolves. The combination of attribute-based routing, multiple destinations, and integration with other connectors makes the Routing Connector essential for production-scale OpenTelemetry deployments.
