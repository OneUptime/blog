# How to Sanitize HTTP Request/Response Headers in OpenTelemetry Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Security, HTTP, Tracing, Data Sanitization

Description: Step-by-step guide to sanitizing sensitive HTTP headers in OpenTelemetry spans to prevent credential leakage in your traces.

---

HTTP headers are one of the richest sources of debugging information in distributed traces. They tell you about authentication methods, content types, caching behavior, and client characteristics. But they also carry some of the most sensitive data your application handles: authorization tokens, session cookies, API keys, and sometimes even user credentials encoded in custom headers.

By default, most OpenTelemetry HTTP instrumentation libraries do not capture request or response headers. But when you enable header capture for debugging purposes, you need to be careful about what ends up in your trace data. This guide covers how to selectively capture headers and sanitize the sensitive ones.

## What Headers Are Dangerous

Not all headers are created equal. Some are perfectly safe to capture, and others should never appear in your traces.

```mermaid
flowchart TD
    A[HTTP Headers] --> B[Safe to Capture]
    A --> C[Needs Sanitization]
    A --> D[Never Capture]
    B --> E[Content-Type]
    B --> F[Accept]
    B --> G[Cache-Control]
    B --> H[User-Agent]
    C --> I[X-Forwarded-For - contains IP]
    C --> J[X-Request-ID]
    D --> K[Authorization]
    D --> L[Cookie / Set-Cookie]
    D --> M[X-API-Key]
    D --> N[Proxy-Authorization]
```

Here is a quick reference for common headers and their risk level:

| Header | Risk | Recommendation |
|---|---|---|
| Authorization | High - contains bearer tokens or basic auth | Never capture or always redact |
| Cookie | High - contains session tokens | Never capture |
| Set-Cookie | High - contains session tokens | Never capture |
| X-API-Key | High - contains API credentials | Never capture or redact |
| X-Forwarded-For | Medium - contains client IPs (PII) | Redact or hash |
| User-Agent | Low - browser/client info | Safe to capture |
| Content-Type | None | Safe to capture |
| Accept | None | Safe to capture |

## Step 1: Control Which Headers Are Captured at the SDK

Most OpenTelemetry instrumentation libraries let you specify exactly which headers to capture. Rather than enabling all headers and then filtering, it is better to start with an allowlist of safe headers.

For Python Flask/Django applications using the WSGI instrumentation, configure the headers you want to capture through environment variables.

These environment variables tell the SDK which specific headers to record as span attributes.

```bash
# Only capture specific safe request headers
export OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_REQUEST="content-type,accept,user-agent,x-request-id"

# Only capture specific safe response headers
export OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_RESPONSE="content-type,x-request-id,x-trace-id"
```

For Java applications using the OpenTelemetry Java agent, the configuration is similar.

These JVM properties control header capture for the Java auto-instrumentation agent.

```bash
# Configure the Java agent to capture only safe headers
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.instrumentation.http.capture-headers.server.request=content-type,accept,user-agent,x-request-id \
  -Dotel.instrumentation.http.capture-headers.server.response=content-type,x-request-id \
  -jar myapp.jar
```

For Node.js applications, you can configure header capture in code when setting up the HTTP instrumentation.

This Node.js configuration sets up selective header capture with a custom hook.

```javascript
// tracing.js - Configure HTTP instrumentation with header filtering
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

const httpInstrumentation = new HttpInstrumentation({
  // Custom hook to selectively capture request headers
  requestHook: (span, request) => {
    // Only capture headers from our allowlist
    const safeHeaders = ['content-type', 'accept', 'user-agent', 'x-request-id'];

    for (const header of safeHeaders) {
      const value = request.headers[header];
      if (value) {
        // Set as span attribute following OTel semantic conventions
        span.setAttribute(`http.request.header.${header}`, value);
      }
    }
  },
  // Custom hook to selectively capture response headers
  responseHook: (span, response) => {
    const safeHeaders = ['content-type', 'x-request-id', 'x-trace-id'];

    for (const header of safeHeaders) {
      const value = response.headers[header];
      if (value) {
        span.setAttribute(`http.response.header.${header}`, value);
      }
    }
  }
});
```

## Step 2: Sanitize Headers at the Collector

Even with SDK-level controls, you should add a safety net at the Collector. Applications get updated, new headers get added, and sometimes developers enable full header capture during debugging and forget to turn it off.

Use the attributes processor to remove known sensitive headers from spans.

This Collector configuration removes sensitive header attributes from all spans passing through the pipeline.

```yaml
# collector-header-sanitization.yaml
processors:
  # Remove known sensitive header attributes
  attributes/remove-sensitive-headers:
    actions:
      # Remove authorization headers
      - key: http.request.header.authorization
        action: delete
      - key: http.response.header.authorization
        action: delete
      # Remove cookie headers
      - key: http.request.header.cookie
        action: delete
      - key: http.response.header.set-cookie
        action: delete
      # Remove API key headers
      - key: http.request.header.x-api-key
        action: delete
      # Remove proxy auth headers
      - key: http.request.header.proxy-authorization
        action: delete

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/remove-sensitive-headers, batch]
      exporters: [otlp]
```

For a more flexible approach, use the transform processor with pattern matching to catch headers that follow common naming conventions for credentials.

This configuration uses OTTL to match and redact header attributes based on naming patterns.

```yaml
# collector-header-pattern-sanitization.yaml
processors:
  # Use transform processor to redact headers matching sensitive patterns
  transform/sanitize-headers:
    trace_statements:
      - context: span
        statements:
          # Redact any header attribute containing "auth" in the name
          - replace_all_patterns(attributes, "key", "http\\.request\\.header\\..*(auth|token|key|secret|password|credential).*", "http.request.header.redacted")
          # Redact cookie values but keep the attribute to show cookies were present
          - replace_pattern(attributes["http.request.header.cookie"], ".*", "[REDACTED]") where attributes["http.request.header.cookie"] != nil

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/sanitize-headers, batch]
      exporters: [otlp]
```

## Step 3: Hash Instead of Delete

Sometimes you need to correlate requests across systems without exposing the actual header values. In these cases, hashing the header value preserves the correlation capability while protecting the sensitive content.

This configuration hashes specific header values using SHA256 instead of deleting them.

```yaml
# collector-header-hashing.yaml
processors:
  # Hash sensitive header values instead of deleting them
  transform/hash-headers:
    trace_statements:
      - context: span
        statements:
          # Hash the X-Forwarded-For header to preserve correlation without exposing IPs
          - set(attributes["http.request.header.x-forwarded-for"], SHA256(attributes["http.request.header.x-forwarded-for"])) where attributes["http.request.header.x-forwarded-for"] != nil
          # Hash the user agent for grouping without storing full strings
          - set(attributes["http.request.header.user-agent"], SHA256(attributes["http.request.header.user-agent"])) where attributes["http.request.header.user-agent"] != nil
```

## Step 4: Build a Custom SpanProcessor for Fine-Grained Control

When you need more complex sanitization logic than what YAML configuration offers, build a custom SpanProcessor. This gives you programmatic control over what happens to header attributes.

This Python SpanProcessor sanitizes headers based on a configurable blocklist and supports different strategies per header.

```python
# header_sanitizer.py
from opentelemetry.sdk.trace import SpanProcessor
import hashlib

class HeaderSanitizingProcessor(SpanProcessor):
    """Sanitizes HTTP header attributes in spans before export."""

    # Headers to completely remove
    BLOCKED_HEADERS = {
        "http.request.header.authorization",
        "http.request.header.cookie",
        "http.response.header.set-cookie",
        "http.request.header.x-api-key",
        "http.request.header.proxy-authorization",
    }

    # Headers to hash instead of remove
    HASH_HEADERS = {
        "http.request.header.x-forwarded-for",
    }

    def on_end(self, span):
        if not span.attributes:
            return

        for attr_key in list(span.attributes.keys()):
            if attr_key in self.BLOCKED_HEADERS:
                # Replace with a marker showing the header was present but redacted
                span.set_attribute(attr_key, "[REDACTED]")
            elif attr_key in self.HASH_HEADERS:
                # Hash the value for correlation without exposure
                value = str(span.attributes[attr_key])
                hashed = hashlib.sha256(value.encode()).hexdigest()[:16]
                span.set_attribute(attr_key, f"sha256:{hashed}")

    def on_start(self, span, parent_context=None):
        pass

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        pass
```

Register this processor when setting up your tracer provider.

```python
# Initialize the tracer provider with the header sanitizer
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter

provider = TracerProvider()
# Add the sanitizer before the exporter so headers are cleaned first
provider.add_span_processor(HeaderSanitizingProcessor())
provider.add_span_processor(BatchSpanExporter(your_exporter))
```

## Step 5: Validate Your Sanitization

After setting up header sanitization, verify that it works. Send test requests with sensitive headers and check what appears in your backend.

This curl command sends a request with various sensitive headers to test your sanitization pipeline.

```bash
# Send a test request with sensitive headers to verify sanitization
curl -X GET https://your-app.example.com/api/test \
  -H "Authorization: Bearer super-secret-token-12345" \
  -H "Cookie: session=abc123def456" \
  -H "X-API-Key: sk-test-key-98765" \
  -H "X-Request-ID: test-sanitization-check" \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 192.168.1.100"
```

Then query your backend to check what was recorded.

```bash
# Query your trace backend and check which headers appear
# The Authorization, Cookie, and X-API-Key headers should be redacted or absent
# The Content-Type and X-Request-ID headers should be present with original values
# The X-Forwarded-For should be hashed if you configured hashing
```

## The Complete Pipeline

Here is how all the sanitization layers work together from request to storage.

```mermaid
flowchart TD
    A[HTTP Request with Headers] --> B[Application]
    B --> C[OTel SDK - Allowlist Filter]
    C -->|Only safe headers captured| D[Span Created]
    D --> E[Custom SpanProcessor]
    E -->|Redact/Hash sensitive values| F[Collector]
    F --> G[Attributes Processor]
    G -->|Delete blocked headers| H[Transform Processor]
    H -->|Pattern-based redaction| I[Backend Storage]
```

## Summary

Sanitizing HTTP headers in OpenTelemetry spans requires a layered approach. Start at the SDK by only capturing the headers you actually need. Add Collector-level processors to catch anything that slips through. Use deletion for high-risk headers like Authorization and Cookie. Use hashing for headers where you need correlation without exposure.

The most common mistake is enabling full header capture for debugging and then forgetting to restrict it. Make your Collector configuration the safety net that catches these oversights. That way, even if an application sends every header, your stored traces stay clean.

Test your sanitization after setting it up. It is easy to get the attribute key names wrong or miss a header variant. Send test traffic, check your backend, and confirm that sensitive values are properly redacted before you consider the job done.
