# How to Troubleshoot Span Name Cardinality Explosion When URL Path Parameters Are Included in Span Names

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cardinality, Span Names, Performance

Description: Troubleshoot and fix high-cardinality span names caused by URL path parameters being included in auto-instrumented span names.

You open your tracing backend and see thousands of unique span names like `GET /users/12345`, `GET /users/67890`, `GET /users/11111`. Instead of one span name `GET /users/{id}`, you have as many unique span names as you have users. This cardinality explosion bloats your storage, slows down queries, and makes it impossible to aggregate metrics by operation.

## Why This Happens

HTTP auto-instrumentation libraries capture the URL path as the span name. If your URLs contain dynamic segments (user IDs, order IDs, UUIDs), each unique URL becomes a unique span name.

```
Expected:   GET /users/{userId}
Actual:     GET /users/abc123
            GET /users/def456
            GET /users/ghi789
            ... (thousands more)
```

This problem affects both server-side and client-side spans.

## Detecting the Problem

```bash
# Count unique span names in your backend
# This query syntax depends on your backend

# In Jaeger, check the operation dropdown - if it has thousands of entries,
# you have a cardinality problem

# Using the Collector's debug exporter to see span names
```

```yaml
# Add debug exporter temporarily
exporters:
  debug:
    verbosity: basic  # Shows span names without full details

service:
  pipelines:
    traces:
      exporters: [debug, otlp]
```

## Fix 1: Configure SDK HTTP Instrumentation

Most auto-instrumentation libraries have options to normalize URL paths.

For Python (Flask/Django):

```python
from opentelemetry.instrumentation.flask import FlaskInstrumentor

# Use the url_rule (route pattern) instead of the actual path
FlaskInstrumentor().instrument_app(app)
# Flask auto-instrumentation uses the route pattern by default: /users/<user_id>
# But if it is not working, check your Flask version and instrumentation version
```

For Node.js (Express):

```javascript
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

const httpInstrumentation = new HttpInstrumentation({
  // Custom hook to normalize span names
  requestHook: (span, request) => {
    // The route will be set later by Express instrumentation
    // Do not set the span name from the raw URL here
  },
});
```

For Java (Spring Boot):

```java
// The Spring Boot auto-instrumentation uses the route pattern by default
// But for servlet-based apps, you might need to configure it:

// In the OTel Java agent configuration
-Dotel.instrumentation.servlet.experimental.capture-request-parameters=false
```

## Fix 2: Use the Collector's Transform Processor

If you cannot fix it at the SDK level, normalize span names in the Collector:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Replace UUIDs in span names with {id}
          - replace_pattern(name, "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "{uuid}")

          # Replace numeric IDs in span names with {id}
          - replace_pattern(name, "/[0-9]+", "/{id}")

          # Replace specific path patterns
          - replace_pattern(name, "/users/[^/]+", "/users/{userId}")
          - replace_pattern(name, "/orders/[^/]+", "/orders/{orderId}")
```

## Fix 3: Use the Span Processor to Group Span Names

Use the `groupbyattrs` processor or a custom span name mapping:

```yaml
processors:
  # Use attributes processor to normalize
  attributes/span-name:
    actions:
      - key: http.route
        action: upsert
        from_attribute: http.route
    include:
      match_type: regexp
      span_names:
        - "GET /users/.*"
        - "POST /orders/.*"
```

## Fix 4: Set Span Names Manually in Code

For critical routes, set the span name explicitly:

```python
from opentelemetry import trace

@app.route('/users/<user_id>')
def get_user(user_id):
    span = trace.get_current_span()
    # Override the auto-generated span name with a normalized one
    span.update_name("GET /users/{userId}")

    # Store the actual user_id as an attribute (low cardinality for the name)
    span.set_attribute("user.id", user_id)

    return fetch_user(user_id)
```

```javascript
// Node.js / Express
app.get('/users/:userId', (req, res) => {
  const span = trace.getActiveSpan();
  span.updateName('GET /users/{userId}');
  span.setAttribute('user.id', req.params.userId);

  // ... handle request
});
```

## Fix 5: Use http.route Attribute

The `http.route` attribute is specifically designed for the URL template. Make sure your framework instrumentation sets it:

```python
# The http.route attribute should contain the template pattern
# For Flask: /users/<user_id>
# For Django: /users/{user_id}/
# For Express: /users/:userId

# Check if it is being set
span = trace.get_current_span()
# http.route should be set by the framework instrumentation
# The span name should be derived from http.route, not http.target
```

## Impact of Cardinality Explosion

High cardinality span names cause:
- Slow queries in your tracing backend
- Bloated indexes and increased storage costs
- Unusable operation-level dashboards and alerts
- Degraded performance in the Collector's spanmetrics processor

Always keep span names at a bounded cardinality. Dynamic values belong in span attributes, not span names. A good rule of thumb: if you have more than a few hundred unique span names across your entire system, something needs normalization.
