# How to Configure the Headers Setter Extension in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Extensions, HTTP Headers, Authentication, Security

Description: Learn how to configure the Headers Setter Extension in OpenTelemetry Collector to dynamically inject authentication tokens, metadata headers, and context propagation headers into outbound requests for secure telemetry export.

---

The Headers Setter Extension in the OpenTelemetry Collector provides powerful capabilities for dynamically adding, modifying, or removing HTTP headers in outbound telemetry requests. This extension is essential for authentication, context propagation, compliance requirements, and integrating with backends that require specific header configurations.

## What is the Headers Setter Extension?

The Headers Setter Extension is an OpenTelemetry Collector component that manipulates HTTP headers on outbound requests from exporters. It operates at the extension level, allowing centralized header management across multiple exporters without duplicating configuration.

The extension supports:

- Dynamic header injection from environment variables and configuration
- Authentication token management and rotation
- Context propagation headers for distributed tracing
- Custom metadata headers for routing and filtering
- Header transformation and normalization
- Conditional header injection based on request properties

Unlike static header configuration in individual exporters, the Headers Setter Extension provides a centralized, flexible approach to header management that simplifies security, compliance, and integration requirements.

## Why Use the Headers Setter Extension?

Modern observability backends require sophisticated authentication and metadata in HTTP requests. The Headers Setter Extension addresses several critical requirements:

**Authentication Management**: Many backends require authentication tokens, API keys, or certificates. Hardcoding these in exporter configurations creates security risks and operational complexity. The extension enables centralized token management with dynamic injection from secure sources like environment variables or secret managers.

**Context Propagation**: Distributed tracing requires propagating trace context across service boundaries. The extension automatically injects W3C Trace Context, B3, or custom propagation headers, ensuring complete trace continuity.

**Multi-Tenant Routing**: SaaS observability platforms often use headers to route telemetry to specific tenants or organizations. The extension dynamically sets tenant identifiers, ensuring proper data isolation.

**Compliance and Audit**: Regulatory requirements may mandate specific headers for audit trails, data classification, or geographic routing. The extension provides a centralized mechanism for enforcing these requirements.

**Backend Integration**: Legacy or specialized backends may require custom headers for routing, protocol negotiation, or feature flags. The extension bridges compatibility gaps without modifying application code.

## Basic Configuration

Here's a foundational configuration demonstrating authentication header injection:

```yaml
# extensions section defines header manipulation
extensions:
  # Configure headers setter extension
  headers_setter:
    # Headers to add to all outbound requests
    headers:
      # Authentication header from environment variable
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"

      # API key for secondary authentication
      - key: X-API-Key
        value: ${API_KEY}

      # Custom metadata headers
      - key: X-Environment
        value: production

      - key: X-Region
        value: us-east-1

# receivers accept telemetry from applications
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

# processors transform telemetry data
processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

# exporters send telemetry to backends
exporters:
  # OTLP HTTP exporter uses headers from extension
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    # Headers from headers_setter extension are automatically applied
    # No need to duplicate header configuration here

service:
  # Enable headers setter extension
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]

    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]

    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

This configuration injects authentication and metadata headers into all OTLP HTTP exports. Environment variables provide secure token injection without exposing credentials in configuration files.

## Advanced Authentication Patterns

### Token Rotation and Refresh

For environments requiring token rotation, configure dynamic token refresh:

```yaml
extensions:
  headers_setter:
    headers:
      # Primary authentication token
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"
        # Refresh token from environment every 5 minutes
        refresh_interval: 5m

      # Backup authentication method
      - key: X-API-Key
        value: ${API_KEY}

      # Token signature for verification
      - key: X-Token-Signature
        value: ${TOKEN_SIGNATURE}
        refresh_interval: 5m

    # Configuration for token refresh
    token_refresh:
      enabled: true
      # Command to refresh tokens (example: call secret manager)
      refresh_command: "/usr/local/bin/refresh-tokens.sh"
      # Refresh before expiration
      refresh_before_expiry: 300s

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    # Headers automatically include refreshed tokens

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

The extension periodically executes the refresh command to obtain new tokens, ensuring continuous authentication without service interruption.

### Multi-Backend Authentication

Different backends often require different authentication schemes. Configure per-exporter headers:

```yaml
extensions:
  # Headers for OneUptime backend
  headers_setter/oneuptime:
    headers:
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"
      - key: X-Environment
        value: production

  # Headers for legacy backend with basic auth
  headers_setter/legacy:
    headers:
      - key: Authorization
        value: "Basic ${LEGACY_BASIC_AUTH}"
      - key: X-Client-ID
        value: otel-collector

  # Headers for cloud provider backend
  headers_setter/cloud:
    headers:
      - key: X-Cloud-API-Key
        value: ${CLOUD_API_KEY}
      - key: X-Cloud-Project
        value: ${CLOUD_PROJECT_ID}

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  # OneUptime exporter with dedicated headers
  otlphttp/oneuptime:
    endpoint: https://oneuptime.com/otlp
    # Uses headers_setter/oneuptime extension

  # Legacy backend exporter
  otlphttp/legacy:
    endpoint: https://legacy.monitoring.internal/api/v1/telemetry
    # Uses headers_setter/legacy extension

  # Cloud provider exporter
  otlphttp/cloud:
    endpoint: https://monitoring.cloud-provider.com/v1/telemetry
    # Uses headers_setter/cloud extension

service:
  # Enable all header extensions
  extensions:
    - headers_setter/oneuptime
    - headers_setter/legacy
    - headers_setter/cloud

  pipelines:
    # Route traces to all backends
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/oneuptime, otlphttp/legacy, otlphttp/cloud]
```

This pattern enables simultaneous export to multiple backends with different authentication requirements.

## Context Propagation Headers

Distributed tracing requires propagating trace context. Configure automatic context header injection:

```yaml
extensions:
  headers_setter:
    headers:
      # Authentication
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"

    # Context propagation configuration
    propagation:
      # W3C Trace Context (standard)
      w3c_trace_context:
        enabled: true
        # Inject traceparent header
        inject_traceparent: true
        # Inject tracestate header
        inject_tracestate: true

      # B3 propagation (Zipkin compatibility)
      b3:
        enabled: true
        # Single header mode (B3: trace-span-sampled)
        single_header: true

      # Baggage propagation for custom metadata
      baggage:
        enabled: true
        # Max baggage size to prevent header overflow
        max_size: 8192

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    # Automatically includes context propagation headers

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

This configuration ensures trace context propagates correctly across service boundaries, maintaining trace continuity in distributed systems.

## Dynamic Header Generation

Generate headers dynamically based on telemetry properties:

```yaml
extensions:
  headers_setter:
    headers:
      # Static authentication
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"

      # Dynamic headers based on telemetry attributes
      - key: X-Service-Name
        # Extract from resource attributes
        from_context: resource.service.name
        # Default if attribute not present
        default: unknown-service

      - key: X-Trace-Priority
        # Compute from span attributes
        from_context: span.attributes.priority
        default: normal

      # Conditional header injection
      - key: X-High-Priority
        value: "true"
        # Only inject if condition matches
        condition: span.attributes.priority == "high"

      # Timestamp-based headers
      - key: X-Export-Time
        # Generate timestamp at export time
        value_type: timestamp
        format: rfc3339

      # Environment-based routing
      - key: X-Target-Cluster
        value: ${TARGET_CLUSTER}
        # Inject only for specific pipelines
        pipelines: [traces/production]

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

  # Ensure attributes exist for header extraction
  resource:
    attributes:
      - key: service.name
        value: ${SERVICE_NAME}
        action: upsert

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  extensions: [headers_setter]

  pipelines:
    traces/production:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp]
```

Dynamic header generation enables sophisticated routing, prioritization, and filtering based on telemetry content.

## Header Transformation and Normalization

Transform existing headers to meet backend requirements:

```yaml
extensions:
  headers_setter:
    # Header transformation rules
    transforms:
      # Rename headers
      - from: X-Original-Token
        to: Authorization
        # Add prefix to transformed value
        prefix: "Bearer "

      # Convert header case
      - from: x-service-name
        to: X-Service-Name
        case: title

      # Extract and transform
      - from: Authorization
        to: X-Auth-Type
        # Extract auth type (Bearer, Basic, etc.)
        extract: "^(\\w+)\\s+"
        output: "$1"

      # Combine multiple headers
      - from: [X-Tenant-ID, X-Environment]
        to: X-Routing-Key
        # Template for combining values
        template: "${X-Tenant-ID}:${X-Environment}"

    # Headers to add after transformation
    headers:
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"

      - key: X-Collector-Version
        value: "0.93.0"

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Header transformation ensures compatibility with backends that have specific header format requirements.

## Security Best Practices

### Secret Management Integration

Integrate with external secret managers for enhanced security:

```yaml
extensions:
  headers_setter:
    # Secret provider configuration
    secrets:
      # AWS Secrets Manager
      provider: aws_secrets_manager
      region: us-east-1
      # Secret refresh interval
      refresh_interval: 15m

    headers:
      # Token from AWS Secrets Manager
      - key: Authorization
        value: "Bearer ${secret:oneuptime-token}"

      # API key from environment
      - key: X-API-Key
        value: ${env:API_KEY}

      # Certificate from file
      - key: X-Client-Cert
        value: ${file:/etc/certs/client.crt}

      # Computed HMAC signature
      - key: X-Signature
        value_type: hmac
        algorithm: sha256
        secret: ${secret:signing-key}
        # Sign request body
        sign_body: true

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

External secret management prevents credential exposure and enables centralized secret rotation.

### Header Redaction in Logs

Prevent credential leakage in debug logs:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"

      - key: X-API-Key
        value: ${API_KEY}

      - key: X-Environment
        value: production

    # Logging configuration
    logging:
      # Redact sensitive headers in logs
      redact_headers:
        - Authorization
        - X-API-Key
        - X-Client-Secret

      # Log header operations (with redaction)
      log_header_operations: true

      # Log level for header operations
      level: debug

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  # Configure Collector logging
  telemetry:
    logs:
      level: debug

  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Header redaction ensures debug logs don't expose authentication credentials or sensitive metadata.

## Performance Optimization

### Header Caching

Cache computed headers to reduce overhead:

```yaml
extensions:
  headers_setter:
    # Caching configuration
    cache:
      enabled: true
      # Cache size limit
      max_entries: 10000
      # Cache TTL for dynamic headers
      ttl: 5m
      # Eviction policy
      eviction: lru

    headers:
      # Static headers (cached indefinitely)
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"
        cacheable: true

      # Dynamic headers (cached with TTL)
      - key: X-Request-ID
        value_type: uuid
        cacheable: true
        cache_ttl: 1m

      # Non-cacheable headers (computed per request)
      - key: X-Timestamp
        value_type: timestamp
        format: rfc3339
        cacheable: false

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Caching reduces CPU overhead for header generation in high-throughput environments.

### Batch Header Operations

Optimize header operations for batched exports:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"

      - key: X-Batch-ID
        value_type: uuid
        # Generate once per batch, not per request
        scope: batch

      - key: X-Batch-Size
        # Compute from batch properties
        from_context: batch.size

      - key: X-Compression
        value: gzip
        # Apply only when compression is enabled
        condition: batch.compressed == true

    # Batch optimization
    batch_optimization:
      enabled: true
      # Maximum batch size for header operations
      max_batch_size: 1000

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Batch-scoped header generation reduces computational overhead for large telemetry batches.

## Monitoring and Observability

Track header operations with internal metrics:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"

      - key: X-Environment
        value: production

    # Metrics configuration
    metrics:
      enabled: true
      # Detailed metrics for troubleshooting
      detailed: true

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  extensions: [headers_setter]

  # Configure Collector self-monitoring
  telemetry:
    metrics:
      level: detailed
      readers:
        - periodic:
            exporter:
              otlp:
                protocol: http/protobuf
                endpoint: https://oneuptime.com/otlp
                headers:
                  x-oneuptime-token: ${ONEUPTIME_TOKEN}

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

**Key Metrics**:

- **otelcol_headers_setter_operations_total**: Total header operations performed
- **otelcol_headers_setter_duration_milliseconds**: Time spent setting headers
- **otelcol_headers_setter_cache_hits_total**: Cache hit count for header lookups
- **otelcol_headers_setter_cache_misses_total**: Cache miss count
- **otelcol_headers_setter_errors_total**: Header operation errors

These metrics help identify performance bottlenecks and troubleshoot header configuration issues.

## Troubleshooting Common Issues

### Debugging Header Injection

Enable detailed logging to verify header injection:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"

      - key: X-Custom-Header
        value: test-value

    # Debug logging
    logging:
      level: debug
      log_header_operations: true
      # Log full header values (disable in production)
      log_header_values: true

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  # Logging exporter for debugging
  logging:
    loglevel: debug

  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  telemetry:
    logs:
      level: debug

  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      # Include logging exporter to see headers
      exporters: [logging, otlphttp]
```

Debug logs show which headers are injected and their final values, helping diagnose configuration issues.

### Header Override Conflicts

Resolve conflicts between extension headers and exporter headers:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value: "Bearer ${ONEUPTIME_TOKEN}"
        # Override exporter header if present
        override: true

      - key: X-Environment
        value: production
        # Don't override if exporter sets this header
        override: false

      - key: Content-Type
        value: application/x-protobuf
        # Merge with existing header value
        merge: true

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    # Exporter-specific headers
    headers:
      X-Exporter-Version: "0.93.0"

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Explicit override and merge policies prevent unexpected header conflicts.

## Production Deployment Example

Complete production configuration with all best practices:

```yaml
extensions:
  headers_setter:
    # Secret management
    secrets:
      provider: aws_secrets_manager
      region: us-east-1
      refresh_interval: 15m

    # Headers configuration
    headers:
      # Authentication with token rotation
      - key: Authorization
        value: "Bearer ${secret:oneuptime-token}"
        refresh_interval: 10m

      # Environment metadata
      - key: X-Environment
        value: ${ENVIRONMENT}

      - key: X-Region
        value: ${AWS_REGION}

      - key: X-Cluster
        value: ${CLUSTER_NAME}

      # Dynamic service identification
      - key: X-Service-Name
        from_context: resource.service.name
        default: unknown

      # Trace context propagation
      - key: traceparent
        value_type: w3c_traceparent

      - key: tracestate
        value_type: w3c_tracestate

    # Caching for performance
    cache:
      enabled: true
      max_entries: 10000
      ttl: 5m

    # Security
    logging:
      level: info
      redact_headers: [Authorization, X-API-Key]
      log_header_operations: true

    # Metrics
    metrics:
      enabled: true
      detailed: true

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_concurrent_streams: 100
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

  batch:
    timeout: 10s
    send_batch_size: 1024

  resource:
    attributes:
      - key: service.name
        value: ${SERVICE_NAME}
        action: upsert

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    compression: gzip
    timeout: 30s

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 5m

    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

service:
  extensions: [headers_setter]

  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      readers:
        - periodic:
            exporter:
              otlp:
                protocol: http/protobuf
                endpoint: https://oneuptime.com/otlp

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlphttp]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
```

This production configuration includes authentication, token rotation, caching, security, and comprehensive monitoring.

## Related Resources

For comprehensive OpenTelemetry Collector configuration, explore these related topics:

- [OpenTelemetry Collector: What It Is, When You Need It, and When You Don't](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
- [How to collect internal metrics from OpenTelemetry Collector](https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view)
- [How to reduce noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)

## Summary

The Headers Setter Extension provides centralized, flexible header management for OpenTelemetry Collector exporters. By configuring authentication, context propagation, and custom metadata headers at the extension level, you simplify security management, enable sophisticated routing, and ensure backend compatibility.

Start with basic authentication header injection using environment variables. As requirements grow, implement token rotation, dynamic header generation, and secret manager integration for production-grade security. Cache computed headers to optimize performance in high-throughput environments.

Monitor header operations through internal metrics to identify performance bottlenecks and configuration issues. Implement header redaction in logs to prevent credential exposure. The extension's flexibility enables sophisticated integration patterns while maintaining security and operational simplicity.

Need a production-grade backend for your OpenTelemetry telemetry? OneUptime provides native support for all standard authentication mechanisms, automatic header handling, and comprehensive security without vendor lock-in.
