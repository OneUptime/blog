# How to Configure the Headers Setter Extension in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Extension, HTTP Headers, Authentication, Security

Description: Learn how to configure the Headers Setter Extension in OpenTelemetry Collector to dynamically inject authentication tokens, metadata headers.

---

The Headers Setter Extension in the OpenTelemetry Collector provides a way to add, update, insert, or delete HTTP and gRPC request headers on outbound exporter requests. It is useful for authentication, multi-tenant routing, and integrating with backends that require specific request headers.

## What is the Headers Setter Extension?

The Headers Setter Extension is an OpenTelemetry Collector contrib component that implements the Collector's `ClientAuthenticator` interface. Exporters that support client authentication can reference it through their `auth.authenticator` setting, and the extension then sets request headers for those outgoing HTTP or gRPC requests.

The extension supports:

- Header injection from configuration values
- Header values read from files, with file watching for rotated credentials
- Header values copied from request metadata with `from_context`
- Header values copied from authentication data with `from_attribute`
- `insert`, `update`, `upsert`, and `delete` actions for outbound headers
- Chaining with another client authentication extension through `additional_auth`

Unlike static header configuration in individual exporters, the Headers Setter Extension lets you centralize header behavior and reuse it from any exporter that supports the Collector's authentication mechanism.

## Why Use the Headers Setter Extension?

Modern observability backends often require authentication and metadata in HTTP or gRPC requests. The Headers Setter Extension addresses several common requirements:

**Authentication Management**: Many backends require tokens or API keys. The extension can inject these values from the Collector configuration or from files such as mounted Kubernetes secrets.

**Multi-Tenant Routing**: SaaS observability platforms often use headers to route telemetry to specific tenants or organizations. The extension can copy incoming request metadata, such as a tenant ID header, to an outbound backend header.

**Compliance and Audit**: Some deployments require consistent metadata headers for audit trails, data classification, or routing. A shared authenticator helps keep those headers consistent across exporters.

**Backend Integration**: Legacy or specialized backends may require custom headers for routing or protocol behavior. The extension can add those headers without changing application instrumentation.

## Basic Configuration

Here's a foundational configuration demonstrating authentication header injection:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value: "Bearer ${env:ONEUPTIME_TOKEN}"
        action: upsert

      - key: X-API-Key
        value: ${env:API_KEY}
        action: upsert

      - key: X-Environment
        value: production
        action: upsert

      - key: X-Region
        value: us-east-1
        action: upsert

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    auth:
      authenticator: headers_setter

service:
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

This configuration injects authentication and metadata headers into OTLP HTTP exports. The key detail is the `auth.authenticator: headers_setter` setting on the exporter; enabling the extension in `service.extensions` is required, but it does not apply headers to exporters by itself.

## Advanced Authentication Patterns

### Token Rotation and Refresh

The Headers Setter Extension does not run token refresh commands. For file-based rotation, write the current token to a file and use `value_file`. The extension watches the file and updates the header value when the file changes:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value_file: /var/run/secrets/oneuptime-token
        action: upsert

      - key: X-API-Key
        value_file: /var/run/secrets/api-key
        action: upsert

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
    auth:
      authenticator: headers_setter

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

This pattern works well with Kubernetes secrets mounted as files or another local credential agent that refreshes token files.

### Multi-Backend Authentication

Different backends often require different authentication schemes. Configure one `headers_setter` instance per backend and reference the matching authenticator from each exporter:

```yaml
extensions:
  headers_setter/oneuptime:
    headers:
      - key: Authorization
        value: "Bearer ${env:ONEUPTIME_TOKEN}"
        action: upsert
      - key: X-Environment
        value: production
        action: upsert

  headers_setter/legacy:
    headers:
      - key: Authorization
        value: "Basic ${env:LEGACY_BASIC_AUTH}"
        action: upsert
      - key: X-Client-ID
        value: otel-collector
        action: upsert

  headers_setter/cloud:
    headers:
      - key: X-Cloud-API-Key
        value: ${env:CLOUD_API_KEY}
        action: upsert
      - key: X-Cloud-Project
        value: ${env:CLOUD_PROJECT_ID}
        action: upsert

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp/oneuptime:
    endpoint: https://oneuptime.com/otlp
    auth:
      authenticator: headers_setter/oneuptime

  otlphttp/legacy:
    endpoint: https://legacy.monitoring.internal/api/v1/telemetry
    auth:
      authenticator: headers_setter/legacy

  otlphttp/cloud:
    endpoint: https://monitoring.cloud-provider.com/v1/telemetry
    auth:
      authenticator: headers_setter/cloud

service:
  extensions:
    - headers_setter/oneuptime
    - headers_setter/legacy
    - headers_setter/cloud

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/oneuptime, otlphttp/legacy, otlphttp/cloud]
```

This pattern enables simultaneous export to multiple backends with different authentication requirements.

## Context Propagation Headers

The Headers Setter Extension can copy values from request metadata, such as incoming HTTP headers, into outbound headers. It does not automatically generate W3C Trace Context, B3, or baggage propagation headers from spans. Trace propagation between applications should be handled by OpenTelemetry SDK propagators; the collector extension is for request metadata and authentication headers.

```yaml
extensions:
  headers_setter:
    headers:
      - key: X-Scope-OrgID
        from_context: tenant_id
        default_value: default-tenant
        action: upsert

      - key: Authorization
        value: "Bearer ${env:ONEUPTIME_TOKEN}"
        action: upsert

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        include_metadata: true

processors:
  batch:
    timeout: 10s
    metadata_keys:
      - tenant_id

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    auth:
      authenticator: headers_setter

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

When `from_context` is used with the batch processor, include the metadata keys in `processors.batch.metadata_keys`; otherwise the metadata can be lost before export.

## Dynamic Header Generation

The extension does not evaluate span attributes, resource attributes, conditions, timestamps, UUIDs, or pipeline names when generating headers. Dynamic behavior is limited to values already present in request metadata or authentication data.

Use `from_context` when the incoming request already has metadata you want to forward:

```yaml
extensions:
  headers_setter:
    headers:
      - key: X-Service-Name
        from_context: service-name
        default_value: unknown-service
        action: upsert

      - key: X-Tenant-ID
        from_context: tenant-id
        default_value: default-tenant
        action: upsert

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        include_metadata: true

processors:
  batch:
    timeout: 10s
    metadata_keys:
      - service-name
      - tenant-id

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    auth:
      authenticator: headers_setter

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

For headers derived from telemetry attributes, transform the telemetry itself with processors and configure the receiving clients or applications to send the required request metadata.

## Header Transformation and Normalization

The Headers Setter Extension does not provide regex transforms, case conversion, templating, or header merging. It supports explicit actions on individual headers:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value: "Bearer ${env:ONEUPTIME_TOKEN}"
        action: upsert

      - key: X-Collector-Version
        value: "0.153.0"
        action: insert

      - key: X-Deprecated-Header
        action: delete

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
    auth:
      authenticator: headers_setter

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Use `insert` when you only want to set a missing header, `update` when you only want to change an existing header, `upsert` when either behavior is acceptable, and `delete` when a header should be removed.

## Security Best Practices

### Secret Management Integration

The extension does not directly integrate with AWS Secrets Manager or compute HMAC signatures. Use Collector environment-variable expansion for values available at process start, or use `value_file` for secrets that are rotated by an external secret manager or sidecar:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value_file: /var/run/secrets/oneuptime-token
        action: upsert

      - key: X-API-Key
        value: ${env:API_KEY}
        action: upsert

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
    auth:
      authenticator: headers_setter

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

External secret management prevents credential exposure and enables centralized secret rotation, while the Collector only needs access to the resolved environment variable or mounted secret file.

### Header Redaction in Logs

The extension does not have a `logging.redact_headers` setting. Keep Collector logs at an appropriate level, avoid logging full configurations with sensitive values, and prefer file-based or environment-based secret injection instead of hardcoding credentials in the configuration.

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value_file: /var/run/secrets/oneuptime-token
        action: upsert

      - key: X-Environment
        value: production
        action: upsert

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
    auth:
      authenticator: headers_setter

service:
  telemetry:
    logs:
      level: info

  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Header redaction should be handled through operational logging policy and by avoiding sensitive literal values in checked-in Collector configuration.

## Performance Optimization

### Header Caching

The Headers Setter Extension does not expose cache settings. Header values from files are watched and updated when the files change; static `value` entries are read from configuration.

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value_file: /var/run/secrets/oneuptime-token
        action: upsert

      - key: X-Environment
        value: production
        action: upsert

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
    auth:
      authenticator: headers_setter

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

For throughput tuning, focus on Collector pipeline settings such as the batch processor, retry behavior, sending queues, memory limits, and exporter compression.

### Batch Header Operations

The extension does not generate batch-scoped UUIDs or compute headers from batch size. If you use `from_context` together with batching, configure the batch processor to preserve the metadata used by the header:

```yaml
extensions:
  headers_setter:
    headers:
      - key: X-Scope-OrgID
        from_context: tenant_id
        default_value: default-tenant
        action: upsert

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        include_metadata: true

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
    metadata_keys:
      - tenant_id

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    auth:
      authenticator: headers_setter

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Batching by metadata can increase memory usage because the batch processor creates separate batchers for distinct metadata combinations, so keep metadata cardinality bounded.

## Monitoring and Observability

The extension does not document custom metrics such as `otelcol_headers_setter_operations_total` or cache hit counters. Monitor the Collector's built-in telemetry, exporter failures, retry metrics, and backend response status to validate that authenticated exports are succeeding.

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value: "Bearer ${env:ONEUPTIME_TOKEN}"
        action: upsert

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
    auth:
      authenticator: headers_setter

service:
  telemetry:
    metrics:
      level: detailed

  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Collector telemetry helps identify exporter errors and pipeline pressure, but it does not expose per-header operation metrics for this extension.

## Troubleshooting Common Issues

### Debugging Header Injection

The Collector debug exporter prints telemetry data, not the HTTP headers sent by another exporter. To verify header injection, use a test backend or HTTP inspection endpoint, and validate the Collector configuration with the Collector binary:

```bash
otelcol-contrib validate --config=config.yaml
```

A minimal configuration for testing headers looks like this:

```yaml
extensions:
  headers_setter:
    headers:
      - key: X-Custom-Header
        value: test-value
        action: upsert

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://example.com/otlp
    auth:
      authenticator: headers_setter

service:
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

If headers are missing, first check that the exporter references the authenticator and that the `headers_setter` extension is listed in `service.extensions`.

### Header Override Conflicts

Resolve conflicts by choosing the correct `action` for each header:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value: "Bearer ${env:ONEUPTIME_TOKEN}"
        action: upsert

      - key: X-Environment
        value: production
        action: insert

      - key: X-Deprecated-Header
        action: delete

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
    headers:
      X-Exporter-Version: "0.153.0"
    auth:
      authenticator: headers_setter

service:
  extensions: [headers_setter]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Explicit actions prevent unexpected header conflicts when exporter-level headers and authenticator-managed headers are used together.

## Production Deployment Example

Complete production configuration with file-based credentials, metadata forwarding, batching, retry, queueing, and memory protection:

```yaml
extensions:
  headers_setter:
    headers:
      - key: Authorization
        value_file: /var/run/secrets/oneuptime-token
        action: upsert

      - key: X-Environment
        value: ${env:ENVIRONMENT}
        action: upsert

      - key: X-Region
        value: ${env:AWS_REGION}
        action: upsert

      - key: X-Cluster
        value: ${env:CLUSTER_NAME}
        action: upsert

      - key: X-Scope-OrgID
        from_context: tenant_id
        default_value: default-tenant
        action: upsert

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_concurrent_streams: 100
      http:
        endpoint: 0.0.0.0:4318
        include_metadata: true

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

  batch:
    timeout: 10s
    send_batch_size: 1024
    metadata_keys:
      - tenant_id

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    compression: gzip
    timeout: 30s
    auth:
      authenticator: headers_setter

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

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
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

This production configuration includes authenticator-managed headers, file-based credential rotation, metadata forwarding, batching, retry, queueing, and internal Collector telemetry.

## Related Resources

For comprehensive OpenTelemetry Collector configuration, explore these related topics:

- [OpenTelemetry Collector: What It Is, When You Need It, and When You Don't](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
- [How to collect internal metrics from OpenTelemetry Collector](https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view)
- [How to reduce noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)

## Summary

The Headers Setter Extension provides centralized header management for OpenTelemetry Collector exporters that support client authentication. Configure headers in the extension, enable the extension in `service.extensions`, and reference it from each exporter with `auth.authenticator`.

Start with basic authentication header injection using environment variables or mounted secret files. As requirements grow, use separate extension instances for different backends, `value_file` for rotated credentials, and `from_context` with `include_metadata` and `batch.metadata_keys` for metadata-based routing.

Monitor export success through the Collector's built-in telemetry and backend responses. Keep sensitive values out of checked-in configuration wherever possible, and validate the final configuration with `otelcol-contrib validate --config=config.yaml` before deploying.

Need a production-grade backend for your OpenTelemetry telemetry? OneUptime provides native support for standard authentication mechanisms, automatic header handling, and comprehensive security without vendor lock-in.
