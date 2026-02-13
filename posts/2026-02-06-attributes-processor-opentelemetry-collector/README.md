# How to Configure the Attributes Processor in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Processors, Attributes Processor, Data Enrichment, Telemetry Transformation

Description: Master the attributes processor in OpenTelemetry Collector to enrich, modify, and sanitize span and metric attributes for better observability and data quality.

The attributes processor is your Swiss Army knife for modifying telemetry attributes in the OpenTelemetry Collector pipeline. It enables you to enrich spans with additional context, mask sensitive data, normalize inconsistent attribute names, and reduce cardinality by removing or hashing high-cardinality attributes.

Proper attribute management is critical for observability. Well-structured attributes enable precise queries, accurate aggregations, and meaningful insights. The attributes processor gives you centralized control over attribute transformations without requiring application code changes.

## Why Attribute Processing Matters

Attributes provide context for telemetry data. A span without attributes is just a name and duration; attributes tell you which user triggered it, which endpoint was called, which region served the request, and what the response status was.

However, attributes often need transformation:

- **Security**: Remove or hash PII like email addresses and user IDs
- **Consistency**: Normalize varying attribute names across services (e.g., `user_id`, `userId`, `user-id` to `user.id`)
- **Enrichment**: Add deployment metadata (version, environment, region)
- **Cardinality control**: Hash or remove unbounded attributes that explode metric dimensions
- **Compliance**: Mask or redact regulated data before export
- **Cost optimization**: Drop unnecessary attributes to reduce storage and network costs

The attributes processor handles these transformations efficiently in the collector pipeline, applying changes once for all exporters.

## Basic Configuration

Here's a minimal attributes processor configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  attributes:
    actions:
      - key: environment
        value: production
        action: insert

      - key: deployment.version
        value: ${DEPLOYMENT_VERSION}
        action: upsert

  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      x-oneuptime-token: "YOUR_TOKEN"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes, batch]
      exporters: [otlphttp]
```

This configuration adds an `environment` attribute to all spans and upserts the deployment version from an environment variable.

## Core Configuration Actions

The attributes processor supports multiple actions for modifying attributes:

### insert

Adds a new attribute only if it doesn't already exist.

```yaml
processors:
  attributes:
    actions:
      - key: service.namespace
        value: production
        action: insert
```

**Use cases**:
- Adding default values for missing attributes
- Enriching spans with deployment metadata
- Adding collector-level context

### update

Modifies an existing attribute, but only if it already exists.

```yaml
processors:
  attributes:
    actions:
      - key: http.url
        value: "[REDACTED]"
        action: update
```

**Use cases**:
- Masking sensitive values in existing attributes
- Normalizing known attribute values
- Correcting malformed attributes

### upsert

Adds a new attribute or updates it if it exists (combination of insert and update).

```yaml
processors:
  attributes:
    actions:
      - key: deployment.version
        value: ${DEPLOY_VERSION}
        action: upsert
```

**Use cases**:
- Ensuring an attribute is always set with a specific value
- Overriding application-provided values
- Injecting dynamic configuration

### delete

Removes an attribute entirely.

```yaml
processors:
  attributes:
    actions:
      - key: http.request.header.authorization
        action: delete
```

**Use cases**:
- Removing sensitive data (passwords, tokens, API keys)
- Reducing cardinality by dropping high-dimension attributes
- Eliminating unnecessary attributes to reduce costs

### hash

Replaces the attribute value with its SHA-256 hash.

```yaml
processors:
  attributes:
    actions:
      - key: user.email
        action: hash
```

**Use cases**:
- Preserving uniqueness while hiding actual values
- Maintaining cardinality for aggregations without exposing PII
- Compliance with data privacy regulations

### extract

Extracts a value from an attribute using a regex pattern and creates a new attribute.

```yaml
processors:
  attributes:
    actions:
      - key: http.url
        pattern: ^https?://([^/]+)/.*
        action: extract
```

**Use cases**:
- Parsing structured data from string attributes
- Extracting domain from URL
- Splitting compound values into discrete attributes

### convert

Changes the data type of an attribute value.

```yaml
processors:
  attributes:
    actions:
      - key: http.status_code
        converted_type: int
        action: convert
```

**Supported types**: `int`, `double`, `string`

**Use cases**:
- Ensuring numeric attributes are properly typed for aggregations
- Converting string representations to numbers
- Normalizing type inconsistencies across services

## Advanced Configuration Examples

### Enriching Spans with Deployment Context

Add deployment metadata to all spans for better incident correlation:

```yaml
processors:
  attributes:
    actions:
      # Add static environment identifier
      - key: deployment.environment
        value: production
        action: insert

      # Add dynamic version from environment variable
      - key: deployment.version
        value: ${GIT_COMMIT_SHA}
        action: upsert

      # Add region information
      - key: cloud.region
        value: us-east-1
        action: insert

      # Add availability zone
      - key: cloud.availability_zone
        value: ${AWS_AZ}
        action: upsert

      # Add cluster identifier
      - key: k8s.cluster.name
        value: prod-cluster-01
        action: insert
```

This enrichment enables powerful queries like "show me all spans from version abc123 in us-east-1" or "compare error rates between availability zones."

### Sanitizing Sensitive Data

Remove or mask PII and sensitive information before export:

```yaml
processors:
  attributes:
    actions:
      # Delete authorization headers
      - key: http.request.header.authorization
        action: delete

      # Delete cookies
      - key: http.request.header.cookie
        action: delete

      # Hash user identifiers
      - key: user.id
        action: hash

      # Hash email addresses
      - key: user.email
        action: hash

      # Redact credit card numbers (if present)
      - key: payment.card_number
        value: "****"
        action: update

      # Delete session tokens
      - key: session.token
        action: delete
```

These transformations ensure compliance with data protection regulations while maintaining observability.

### Normalizing Attribute Names

Different services might use inconsistent naming conventions. Standardize them in the collector:

```yaml
processors:
  # First, copy old names to standard names
  attributes/normalize:
    actions:
      # Standardize user identifier
      - key: user.id
        from_attribute: userId
        action: insert

      - key: user.id
        from_attribute: user_id
        action: insert

      # Standardize request ID
      - key: request.id
        from_attribute: requestId
        action: insert

      - key: request.id
        from_attribute: request_id
        action: insert

      # Delete old naming variants
      - key: userId
        action: delete

      - key: user_id
        action: delete

      - key: requestId
        action: delete

      - key: request_id
        action: delete
```

### Extracting Structured Data

Parse useful information from complex attribute values:

```yaml
processors:
  attributes:
    actions:
      # Extract HTTP method from combined attribute
      - key: http.method
        from_attribute: http.request
        pattern: ^([A-Z]+)\s
        action: extract

      # Extract hostname from URL
      - key: http.host
        from_attribute: http.url
        pattern: ^https?://([^/:]+)
        action: extract

      # Extract path from URL
      - key: http.path
        from_attribute: http.url
        pattern: ^https?://[^/]+(/.*)$
        action: extract

      # Extract status code from response
      - key: http.status_code
        from_attribute: http.response
        pattern: HTTP/\d\.\d\s(\d{3})
        action: extract
```

### Reducing Cardinality

High-cardinality attributes can explode metric dimensions and increase costs. Control cardinality by removing or transforming problematic attributes:

```yaml
processors:
  attributes:
    actions:
      # Delete unbounded user identifiers from metrics
      - key: user.id
        action: delete

      # Hash session IDs to preserve uniqueness but bound cardinality
      - key: session.id
        action: hash

      # Remove query parameters that vary per request
      - key: http.url
        from_attribute: http.url
        pattern: ^([^?]+)
        action: extract

      # Delete trace and span IDs (not needed in metrics)
      - key: trace_id
        action: delete

      - key: span_id
        action: delete
```

### Conditional Attribute Processing

Use the `include` and `exclude` directives to apply actions selectively:

```yaml
processors:
  attributes:
    # Only process spans from specific services
    include:
      match_type: strict
      services:
        - checkout-service
        - payment-service

    actions:
      - key: sensitive.data
        action: delete

  attributes/exclude_healthchecks:
    # Don't process health check spans
    exclude:
      match_type: strict
      span_names:
        - /healthz
        - /readyz

    actions:
      - key: deployment.version
        value: ${VERSION}
        action: upsert
```

### Multi-Stage Attribute Processing

Complex transformations often require multiple processor stages:

```yaml
processors:
  # Stage 1: Sanitize sensitive data
  attributes/sanitize:
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: user.email
        action: hash

  # Stage 2: Normalize naming
  attributes/normalize:
    actions:
      - key: user.id
        from_attribute: userId
        action: insert
      - key: userId
        action: delete

  # Stage 3: Enrich with metadata
  attributes/enrich:
    actions:
      - key: deployment.version
        value: ${GIT_SHA}
        action: upsert
      - key: deployment.environment
        value: production
        action: insert

  batch:
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/sanitize, attributes/normalize, attributes/enrich, batch]
      exporters: [otlphttp]
```

This multi-stage approach separates concerns and makes the pipeline easier to understand and maintain.

## Working with Resource Attributes

The attributes processor modifies span and metric attributes, not resource attributes. For resource-level transformations, use the resource processor:

```yaml
processors:
  # Modify span/metric attributes
  attributes:
    actions:
      - key: http.status_code
        converted_type: int
        action: convert

  # Modify resource attributes (service-level metadata)
  resource:
    attributes:
      - key: service.namespace
        value: production
        action: insert
      - key: service.version
        value: ${VERSION}
        action: upsert
```

**Key distinction**:

- **attributes processor**: Per-span/metric attributes (e.g., `http.status_code`, `user.id`)
- **resource processor**: Service-level attributes (e.g., `service.name`, `service.namespace`, `deployment.environment`)

## Attribute Processing for Different Signal Types

### Traces

```yaml
processors:
  attributes/traces:
    actions:
      # Enrich spans with trace-specific context
      - key: trace.sampling.priority
        value: high
        action: insert

      # Sanitize URLs in trace spans
      - key: http.url
        pattern: ^([^?]+)
        action: extract

service:
  pipelines:
    traces:
      processors: [attributes/traces, batch]
```

### Metrics

```yaml
processors:
  attributes/metrics:
    actions:
      # Reduce metric cardinality
      - key: user.id
        action: delete

      # Normalize metric labels
      - key: status
        from_attribute: http.status_code
        action: insert

service:
  pipelines:
    metrics:
      processors: [attributes/metrics, batch]
```

### Logs

```yaml
processors:
  attributes/logs:
    actions:
      # Hash sensitive log attributes
      - key: user.email
        action: hash

      # Add log-specific enrichment
      - key: log.source
        value: collector
        action: insert

service:
  pipelines:
    logs:
      processors: [attributes/logs, batch]
```

## Performance Considerations

Attribute processing adds minimal overhead, but inefficient configurations can impact performance:

### Efficient Pattern

```yaml
processors:
  attributes:
    actions:
      # Simple operations are fast
      - key: environment
        value: prod
        action: insert

      # Direct deletes are fast
      - key: sensitive.data
        action: delete
```

### Inefficient Pattern

```yaml
processors:
  attributes:
    actions:
      # Complex regex on every span is expensive
      - key: parsed.value
        from_attribute: complex.string
        pattern: ^very(complex|regex|pattern|with|many|alternatives)$
        action: extract
```

**Performance best practices**:

1. **Place expensive operations late**: Process after filtering drops unwanted spans
2. **Limit regex complexity**: Simple patterns perform better than complex alternations
3. **Batch similar operations**: Group related actions in one processor instance
4. **Use include/exclude**: Skip processing for spans that don't need transformation

## Monitoring Attribute Processing

Monitor the impact of attribute transformations:

```bash
# Query collector metrics
curl http://localhost:8888/metrics | grep processor_attributes

# Key metrics:
# - otelcol_processor_accepted_spans: Spans processed
# - otelcol_processor_refused_spans: Spans rejected
# - otelcol_processor_dropped_spans: Spans dropped
```

Set up alerts for unexpected behavior:

```yaml
# Alert if attribute processor starts dropping spans
- alert: AttributeProcessorDroppingSpans
  expr: rate(otelcol_processor_dropped_spans{processor="attributes"}[5m]) > 0
  annotations:
    summary: Attribute processor dropping spans
```

## Common Patterns and Use Cases

### Pattern 1: PII Masking for GDPR Compliance

```yaml
processors:
  attributes/gdpr:
    actions:
      # Hash user identifiers
      - key: user.id
        action: hash
      - key: user.email
        action: hash

      # Delete IP addresses
      - key: http.client_ip
        action: delete

      # Redact names
      - key: user.name
        value: "[REDACTED]"
        action: update
```

### Pattern 2: Multi-Tenant Context Injection

```yaml
processors:
  attributes/tenant:
    actions:
      # Add tenant identifier from header
      - key: tenant.id
        from_attribute: http.request.header.x-tenant-id
        action: insert

      # Add tenant tier for priority handling
      - key: tenant.tier
        from_attribute: http.request.header.x-tenant-tier
        action: insert
```

### Pattern 3: Deployment Marker Injection

```yaml
processors:
  attributes/deployment:
    actions:
      # Add deployment timestamp
      - key: deployment.timestamp
        value: ${DEPLOY_TIMESTAMP}
        action: upsert

      # Add deployment ID
      - key: deployment.id
        value: ${DEPLOY_ID}
        action: upsert

      # Add canary indicator
      - key: deployment.canary
        value: "true"
        action: insert
```

### Pattern 4: Error Context Enrichment

```yaml
processors:
  attributes/errors:
    # Only process error spans
    include:
      match_type: strict
      attributes:
        - key: error
          value: true

    actions:
      # Add error severity
      - key: error.severity
        value: high
        action: insert

      # Add alert routing tag
      - key: alert.route
        value: on-call
        action: insert
```

## Testing Attribute Transformations

Validate your attribute processing with a test pipeline:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  attributes:
    actions:
      - key: test.attribute
        value: test-value
        action: insert
      - key: sensitive.data
        action: delete

exporters:
  logging:
    verbosity: detailed  # Shows all attributes

  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes]
      exporters: [logging, otlphttp]
```

Send test spans and inspect the logging exporter output to verify transformations:

```bash
# Start collector
otelcol --config test-config.yaml

# Send test span (using otel CLI or test application)
# Check collector logs for transformed attributes
```

## Production Checklist

Before deploying attribute processor to production:

- [ ] All sensitive attributes identified and masked/deleted
- [ ] Attribute naming conventions standardized across services
- [ ] High-cardinality attributes controlled (deleted or hashed)
- [ ] Deployment metadata enrichment configured
- [ ] Include/exclude filters optimize processing
- [ ] Multi-stage processors ordered correctly (sanitize → normalize → enrich)
- [ ] Resource processor used for service-level attributes
- [ ] Test pipeline validates all transformations
- [ ] Monitoring configured for processor metrics
- [ ] Documentation updated with attribute standards

## Key Takeaways

The attributes processor is essential for production-grade OpenTelemetry deployments. It centralizes attribute transformations, enabling consistent data quality, security, and compliance across your observability pipeline.

Use it to enrich spans with deployment context, sanitize sensitive data, normalize inconsistent naming, and control cardinality. Structure your pipeline with multiple attribute processor stages for clarity: sanitize first, then normalize, then enrich.

Always test transformations thoroughly before production deployment, and monitor processor metrics to ensure transformations work as expected.

**Related Reading:**

- [How to Configure the Resource Processor in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-resource-processor-opentelemetry-collector/view)
- [How to Configure the Filter Processor in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-filter-processor-opentelemetry-collector/view)
- [How to reduce noise in OpenTelemetry?](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- [Keep PII out of observability telemetry](https://oneuptime.com/blog/post/2025-11-13-keep-pii-out-of-observability-telemetry/view)
