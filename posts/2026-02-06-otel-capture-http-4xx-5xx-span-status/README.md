# How to Configure OpenTelemetry to Capture HTTP 4xx vs 5xx Errors with Different Span Status Strategies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HTTP Errors, Span Status, Configuration

Description: Configure OpenTelemetry to handle HTTP 4xx and 5xx errors differently using custom span status strategies for accurate metrics.

HTTP 4xx errors and 5xx errors are fundamentally different. A 4xx means the client sent a bad request. A 5xx means your server broke. Treating them the same in your OpenTelemetry spans leads to inflated error rates and noisy alerts. This post covers how to configure different span status strategies for each class of HTTP error.

## The Default Behavior Problem

Most OpenTelemetry HTTP instrumentations set the span status to `ERROR` for any response code >= 400. This means a wave of bots hitting nonexistent URLs (404s) or sending malformed requests (400s) will spike your error rate even though your server is perfectly healthy.

## Strategy 1: Server Spans vs Client Spans

The OpenTelemetry spec actually distinguishes between server and client span behavior:

- **Server spans**: Only HTTP 5xx should set `ERROR` status. 4xx responses mean the server handled the request correctly.
- **Client spans**: HTTP 4xx and 5xx may both indicate errors, since the client expected a successful response.

Here is how to implement this in a custom span status hook:

```javascript
// http-status-strategy.js - Custom HTTP span status logic
const { SpanStatusCode } = require("@opentelemetry/api");

/**
 * Custom hook for HTTP instrumentation that applies different
 * span status strategies for 4xx vs 5xx responses.
 */
function serverResponseHook(span, response) {
  const statusCode = response.statusCode;

  // Always record the HTTP status code as an attribute
  span.setAttribute("http.status_code", statusCode);

  if (statusCode >= 500) {
    // 5xx: Server error - this is a real problem
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `Server error: HTTP ${statusCode}`,
    });
    span.setAttribute("error.category", "server_error");
  } else if (statusCode >= 400) {
    // 4xx: Client error - server worked correctly
    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttribute("http.client_error", true);
    span.setAttribute("error.category", "client_error");

    // Track specific 4xx codes that might indicate server problems
    if (statusCode === 429) {
      // Rate limiting might mean we need to scale
      span.setAttribute("http.rate_limited", true);
    }
    if (statusCode === 408) {
      // Request timeout could indicate slow processing
      span.setAttribute("http.request_timeout", true);
    }
  } else if (statusCode >= 200) {
    span.setStatus({ code: SpanStatusCode.OK });
  }
}

module.exports = { serverResponseHook };
```

## Strategy 2: Configuring the Express Instrumentation

Apply the custom hook to the Express HTTP instrumentation:

```javascript
// tracing.js - Configure OpenTelemetry with custom HTTP status handling
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { ExpressInstrumentation } = require("@opentelemetry/instrumentation-express");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");
const { serverResponseHook } = require("./http-status-strategy");

const sdk = new NodeSDK({
  serviceName: "my-api",
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4317",
  }),
  instrumentations: [
    new HttpInstrumentation({
      // Apply custom response hook for server spans
      responseHook: (span, response) => {
        serverResponseHook(span, response);
      },
    }),
    new ExpressInstrumentation(),
  ],
});

sdk.start();
```

## Strategy 3: Python Flask with Custom Status Logic

```python
# flask_status_strategy.py
from opentelemetry import trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from functools import wraps

def custom_response_hook(span, status_code, response_headers):
    """
    Custom hook that sets span status based on HTTP status code
    with different strategies for 4xx vs 5xx.
    """
    if status_code >= 500:
        span.set_status(trace.StatusCode.ERROR, f"HTTP {status_code}")
        span.set_attribute("error.category", "server_error")
    elif status_code >= 400:
        # Do NOT set ERROR for 4xx
        span.set_status(trace.StatusCode.OK)
        span.set_attribute("http.client_error", True)

        # Subcategorize 4xx errors for monitoring
        if status_code == 401 or status_code == 403:
            span.set_attribute("error.category", "auth_error")
        elif status_code == 404:
            span.set_attribute("error.category", "not_found")
        elif status_code == 429:
            span.set_attribute("error.category", "rate_limit")
        else:
            span.set_attribute("error.category", "client_error")

# Apply to Flask
FlaskInstrumentor().instrument(
    response_hook=custom_response_hook,
)
```

## Strategy 4: Selective 4xx Errors as Span Errors

Sometimes specific 4xx errors do indicate server-side problems. A 401 might mean your auth service is down. A 429 might mean you need to scale. Create a configurable strategy:

```python
# selective_4xx_strategy.py
from opentelemetry import trace

class SelectiveHttpStatusStrategy:
    """
    Configurable strategy for which HTTP status codes
    should be treated as span errors.
    """

    def __init__(self):
        # 4xx codes that should be treated as errors
        # (because they might indicate server-side problems)
        self.error_4xx_codes = set()

        # 5xx codes that should NOT be treated as errors
        # (because they are expected behavior)
        self.expected_5xx_codes = set()

    def treat_as_error(self, *status_codes):
        """Mark specific 4xx codes as errors."""
        for code in status_codes:
            self.error_4xx_codes.add(code)
        return self

    def treat_as_expected(self, *status_codes):
        """Mark specific 5xx codes as expected (not errors)."""
        for code in status_codes:
            self.expected_5xx_codes.add(code)
        return self

    def apply(self, span, status_code):
        """Apply the strategy to a span."""
        span.set_attribute("http.status_code", status_code)

        if status_code >= 500:
            if status_code in self.expected_5xx_codes:
                span.set_status(trace.StatusCode.OK)
                span.set_attribute("http.expected_error", True)
            else:
                span.set_status(
                    trace.StatusCode.ERROR,
                    f"HTTP {status_code}"
                )
        elif status_code >= 400:
            if status_code in self.error_4xx_codes:
                span.set_status(
                    trace.StatusCode.ERROR,
                    f"HTTP {status_code}"
                )
            else:
                span.set_status(trace.StatusCode.OK)
                span.set_attribute("http.client_error", True)
        else:
            span.set_status(trace.StatusCode.OK)


# Example configuration
strategy = SelectiveHttpStatusStrategy()

# Treat 429 (rate limit) as a server error because it means
# we are not handling load properly
strategy.treat_as_error(429)

# Treat 503 (maintenance mode) as expected during deploys
strategy.treat_as_expected(503)
```

## Building Separate Dashboards

With 4xx and 5xx tracked separately, you can build more useful dashboards:

```promql
# True server error rate (only 5xx)
sum(rate(otel_traces_spanmetrics_calls_total{
  status_code="STATUS_CODE_ERROR",
  error_category="server_error"
}[5m]))
/
sum(rate(otel_traces_spanmetrics_calls_total[5m]))

# Client error rate (4xx) - for monitoring API usage patterns
sum(rate(otel_traces_spanmetrics_calls_total{
  http_client_error="true"
}[5m]))
/
sum(rate(otel_traces_spanmetrics_calls_total[5m]))

# Auth error rate specifically
sum(rate(otel_traces_spanmetrics_calls_total{
  error_category="auth_error"
}[5m]))
/
sum(rate(otel_traces_spanmetrics_calls_total[5m]))
```

## Collector-Level Normalization

If you cannot modify every service, normalize at the collector level using the transform processor:

```yaml
# otel-collector-config.yaml
processors:
  transform:
    trace_statements:
      - context: span
        conditions:
          - 'attributes["http.status_code"] >= 400 and attributes["http.status_code"] < 500'
        statements:
          - 'set(status.code, 1)'  # Set to OK
          - 'set(attributes["http.client_error"], "true")'
```

## Conclusion

Treating HTTP 4xx and 5xx differently in your OpenTelemetry spans is essential for accurate error rates. 5xx errors represent real problems your team needs to fix. 4xx errors are information about client behavior. By configuring different span status strategies for each, your dashboards show real server health and your alerts fire on actual incidents rather than bad bot traffic.
