# How to Configure Attribute Limits in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Attributes, Limits, Performance, Cardinality, Observability, Configuration

Description: Learn how to configure attribute limits in OpenTelemetry to prevent memory issues, control costs, and maintain system stability while preserving essential telemetry data.

---

Attributes add context to your telemetry, but unbounded attributes create problems. A single span with thousands of attributes, or attribute values containing megabytes of data, can crash collectors, explode storage costs, and make data unusable. OpenTelemetry provides configurable limits to protect your pipeline.

## Why Attribute Limits Matter

Without limits, common mistakes cause serious issues:

- Logging entire request bodies as attributes
- Including unbounded lists (all user IDs, all product IDs)
- High-cardinality values (unique session IDs, timestamps)
- Recursive object serialization
- Accidentally capturing sensitive data

Limits provide guardrails that prevent these issues from taking down your observability infrastructure.

## SDK-Level Limits

Configure limits in your application SDK to prevent bad data at the source.

### Node.js Configuration

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'my-service',
  }),

  // Span limits configuration
  spanLimits: {
    // Maximum number of attributes per span
    attributeCountLimit: 128,

    // Maximum length of string attribute values
    attributeValueLengthLimit: 1024,

    // Maximum number of events per span
    eventCountLimit: 128,

    // Maximum number of links per span
    linkCountLimit: 128,

    // Maximum attributes per event
    attributePerEventCountLimit: 32,

    // Maximum attributes per link
    attributePerLinkCountLimit: 32,
  },
});

sdk.start();
```

### Python Configuration

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, SpanLimits
from opentelemetry.sdk.resources import Resource

# Define span limits
span_limits = SpanLimits(
    # Maximum attributes per span
    max_attributes=128,

    # Maximum length of string attribute values
    max_attribute_length=1024,

    # Maximum events per span
    max_events=128,

    # Maximum links per span
    max_links=128,

    # Maximum attributes per event
    max_event_attributes=32,

    # Maximum attributes per link
    max_link_attributes=32,
)

# Create provider with limits
provider = TracerProvider(
    resource=Resource.create({'service.name': 'my-service'}),
    span_limits=span_limits,
)

trace.set_tracer_provider(provider)
```

### Go Configuration

```go
package main

import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/sdk/trace"
)

func initTracer() {
    // Configure span limits
    spanLimits := trace.NewSpanLimits()
    spanLimits.AttributeCountLimit = 128
    spanLimits.AttributeValueLengthLimit = 1024
    spanLimits.EventCountLimit = 128
    spanLimits.LinkCountLimit = 128
    spanLimits.AttributePerEventCountLimit = 32
    spanLimits.AttributePerLinkCountLimit = 32

    tp := trace.NewTracerProvider(
        trace.WithSpanLimits(spanLimits),
    )

    otel.SetTracerProvider(tp)
}
```

### Java Configuration

```java
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.SpanLimits;

public class TracingConfig {
    public static OpenTelemetrySdk init() {
        SpanLimits spanLimits = SpanLimits.builder()
            // Maximum attributes per span
            .setMaxNumberOfAttributes(128)
            // Maximum length of string attribute values
            .setMaxAttributeValueLength(1024)
            // Maximum events per span
            .setMaxNumberOfEvents(128)
            // Maximum links per span
            .setMaxNumberOfLinks(128)
            // Maximum attributes per event
            .setMaxNumberOfAttributesPerEvent(32)
            // Maximum attributes per link
            .setMaxNumberOfAttributesPerLink(32)
            .build();

        SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
            .setSpanLimits(spanLimits)
            .build();

        return OpenTelemetrySdk.builder()
            .setTracerProvider(tracerProvider)
            .build();
    }
}
```

## Environment Variable Configuration

Set limits via environment variables for consistent configuration across services:

```bash
# Attribute limits
OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT=128
OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT=1024

# Event limits
OTEL_SPAN_EVENT_COUNT_LIMIT=128

# Link limits
OTEL_SPAN_LINK_COUNT_LIMIT=128

# Event and link attribute limits
OTEL_EVENT_ATTRIBUTE_COUNT_LIMIT=32
OTEL_LINK_ATTRIBUTE_COUNT_LIMIT=32
```

Environment variables provide a deployment-time configuration mechanism that works across all SDKs.

## Collector-Level Limits

The OpenTelemetry Collector can enforce limits as an additional safety net.

### Transform Processor for Truncation

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Truncate all attribute values to 1024 characters
          - truncate_all(attributes, 1024)

      - context: spanevent
        statements:
          - truncate_all(attributes, 512)
```

### Attributes Processor for Removal

```yaml
processors:
  attributes:
    actions:
      # Remove attributes that exceed cardinality thresholds
      - key: request.body
        action: delete

      - key: response.body
        action: delete

      # Hash high-cardinality values
      - key: user.session_id
        action: hash
```

### Filter Processor for Dropping

```yaml
processors:
  filter:
    traces:
      span:
        # Drop spans with excessive attributes
        - 'attributes["data.size"] > 1000000'  # > 1MB

        # Drop spans with specific problematic attributes
        - 'IsMatch(attributes["query"], ".*SELECT \\* FROM large_table.*")'
```

### Memory Limiter Processor

Protect against memory exhaustion from large payloads:

```yaml
processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 2048
    spike_limit_mib: 512
```

## Handling Large Values

When you need to capture large values, use these strategies instead of increasing limits.

### Truncation with Indicator

```javascript
function safeSetAttribute(span, key, value) {
  const MAX_LENGTH = 1024;

  if (typeof value === 'string' && value.length > MAX_LENGTH) {
    // Truncate and indicate truncation
    span.setAttribute(key, value.substring(0, MAX_LENGTH));
    span.setAttribute(`${key}.truncated`, true);
    span.setAttribute(`${key}.original_length`, value.length);
  } else {
    span.setAttribute(key, value);
  }
}

// Usage
safeSetAttribute(span, 'http.request.body', requestBody);
```

### Hashing for High-Cardinality Values

```javascript
const crypto = require('crypto');

function setHashedAttribute(span, key, value) {
  const hash = crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .substring(0, 16);

  span.setAttribute(`${key}.hash`, hash);
}

// Usage - correlate by hash instead of raw value
setHashedAttribute(span, 'user.session_id', sessionId);
```

### Sampling Large Payloads

```javascript
function setPayloadSample(span, key, payload) {
  const MAX_SAMPLE_SIZE = 500;

  if (typeof payload === 'string') {
    span.setAttribute(key, payload.substring(0, MAX_SAMPLE_SIZE));
    span.setAttribute(`${key}.is_sample`, payload.length > MAX_SAMPLE_SIZE);
  } else if (typeof payload === 'object') {
    const serialized = JSON.stringify(payload);
    span.setAttribute(key, serialized.substring(0, MAX_SAMPLE_SIZE));
    span.setAttribute(`${key}.is_sample`, serialized.length > MAX_SAMPLE_SIZE);
  }
}
```

### Reference IDs Instead of Data

```javascript
async function processLargePayload(span, payload) {
  // Store large payload externally
  const payloadId = await storePayload(payload);

  // Reference it in the span
  span.setAttribute('payload.id', payloadId);
  span.setAttribute('payload.size_bytes', JSON.stringify(payload).length);
  span.setAttribute('payload.storage', 's3://traces-payloads/');

  // Can be retrieved for debugging if needed
}
```

## Cardinality Control Patterns

High cardinality exhausts memory and storage. Control it at the source.

### Bucketing Numeric Values

```javascript
function setLatencyBucket(span, latencyMs) {
  let bucket;
  if (latencyMs < 10) bucket = '0-10ms';
  else if (latencyMs < 50) bucket = '10-50ms';
  else if (latencyMs < 100) bucket = '50-100ms';
  else if (latencyMs < 500) bucket = '100-500ms';
  else if (latencyMs < 1000) bucket = '500ms-1s';
  else bucket = '>1s';

  span.setAttribute('latency.bucket', bucket);
  // Also keep the exact value for aggregation
  span.setAttribute('latency.ms', latencyMs);
}
```

### Grouping Dynamic Paths

```javascript
function normalizeRoute(path) {
  // /users/123/orders/456 -> /users/{id}/orders/{id}
  return path
    .replace(/\/\d+/g, '/{id}')
    .replace(/\/[a-f0-9-]{36}/g, '/{uuid}');
}

span.setAttribute('http.route', normalizeRoute(req.path));
span.setAttribute('http.path', req.path); // Keep original for debugging
```

### Limiting Array Attributes

```javascript
function setArrayAttribute(span, key, values, maxItems = 10) {
  const limited = values.slice(0, maxItems);

  span.setAttribute(key, limited);
  span.setAttribute(`${key}.count`, values.length);

  if (values.length > maxItems) {
    span.setAttribute(`${key}.truncated`, true);
  }
}

// Usage
setArrayAttribute(span, 'product.ids', productIds);
```

## Complete Configuration Example

Here is a comprehensive setup combining SDK and collector limits.

### SDK Configuration (Node.js)

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');

// Conservative limits for production
const SPAN_LIMITS = {
  attributeCountLimit: 64,
  attributeValueLengthLimit: 512,
  eventCountLimit: 64,
  linkCountLimit: 16,
  attributePerEventCountLimit: 16,
  attributePerLinkCountLimit: 16,
};

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': process.env.OTEL_SERVICE_NAME,
    'service.version': process.env.APP_VERSION,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  spanLimits: SPAN_LIMITS,
});

sdk.start();

console.log('Tracing initialized with limits:', SPAN_LIMITS);
```

### Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # First line of defense: memory limits
  memory_limiter:
    check_interval: 5s
    limit_mib: 2048
    spike_limit_mib: 512

  # Truncate oversized values
  transform:
    trace_statements:
      - context: span
        statements:
          - truncate_all(attributes, 512)
      - context: spanevent
        statements:
          - truncate_all(attributes, 256)

  # Remove known problematic attributes
  attributes:
    actions:
      - key: http.request.body
        action: delete
      - key: http.response.body
        action: delete
      - key: db.statement
        action: delete  # Often contains sensitive data

  # Filter extreme outliers
  filter:
    traces:
      span:
        - 'attributes["data.too_large"] == true'

  batch:
    send_batch_size: 1024
    timeout: 5s

exporters:
  otlphttp:
    endpoint: "https://backend.example.com"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, transform, attributes, filter, batch]
      exporters: [otlphttp]
```

## Monitoring Limit Violations

Track when limits are being hit to identify instrumentation issues.

### Custom Metric for Truncations

```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('instrumentation-health');
const truncationCounter = meter.createCounter('otel.attribute.truncations', {
  description: 'Count of attribute value truncations',
});

function safeSetAttribute(span, key, value) {
  const MAX_LENGTH = 512;

  if (typeof value === 'string' && value.length > MAX_LENGTH) {
    span.setAttribute(key, value.substring(0, MAX_LENGTH));
    truncationCounter.add(1, {
      'attribute.key': key,
      'service.name': process.env.OTEL_SERVICE_NAME,
    });
  } else {
    span.setAttribute(key, value);
  }
}
```

### Collector Metrics

The collector exposes metrics about dropped data:

```yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

Monitor `otelcol_processor_dropped_*` metrics for signs of limit violations.

## Conclusion

Attribute limits protect your observability pipeline from runaway telemetry. Configure limits in both SDKs and the collector for defense in depth. Use truncation, hashing, and reference IDs to handle large values gracefully. Control cardinality through bucketing and normalization. Monitor limit violations to catch instrumentation issues early. Well-configured limits ensure your telemetry remains useful and your infrastructure stays healthy.
