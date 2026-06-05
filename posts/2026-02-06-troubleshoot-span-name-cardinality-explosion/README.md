# How to Troubleshoot Span Name Cardinality Explosion When URL Path Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cardinality, Span Name, Performance

Description: Troubleshoot and fix high-cardinality span names caused by URL path parameters being included in auto-instrumented span names.

You open your tracing backend and see thousands of unique span names like `GET /users/12345`, `GET /users/67890`, `GET /users/11111`. Instead of one span name `GET /users/{id}`, you have as many unique span names as you have users. This cardinality explosion bloats your storage, slows down queries, and makes it impossible to aggregate metrics by operation.

## Why This Happens

Some HTTP auto-instrumentation libraries, older instrumentation versions, custom hooks, or framework middleware that cannot see the matched route can capture the raw URL path as the span name. If your URLs contain dynamic segments (user IDs, order IDs, UUIDs), each unique URL becomes a unique span name.

```text
Expected:   GET /users/{userId}
Actual:     GET /users/abc123
            GET /users/def456
            GET /users/ghi789
            ... (thousands more)
```

OpenTelemetry semantic conventions say HTTP instrumentation should use a low-cardinality target when one is available, such as `http.route` for server spans or `url.template` for client spans. The problem appears when that template is missing or the span name is overridden with the raw path.

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

Most framework-aware auto-instrumentation libraries use route templates when they are available. Check that the framework instrumentation is enabled in addition to lower-level HTTP instrumentation.

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
const { ExpressLayerType } = require('@opentelemetry/instrumentation-express');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

const httpInstrumentation = new HttpInstrumentation({
  // Do not set the span name from request.url here.
});

const expressInstrumentation = new ExpressInstrumentation({
  spanNameHook: (info, defaultName) => {
    if (info.layerType === ExpressLayerType.REQUEST_HANDLER && info.route) {
      return `${info.request.method} ${info.route}`;
    }
    return defaultName;
  },
});
```

For Java (Spring Boot):

```java
// Spring Web MVC instrumentation should set http.route and use route patterns
// for server span names when the route is available.
// The servlet capture-request-parameters option captures named request
// parameters as attributes; it does not normalize span names.
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

Use the `span` processor to extract dynamic path segments from the span name and replace them with placeholders:

```yaml
processors:
  span/to_attributes:
    include:
      match_type: regexp
      span_names:
        - "GET /users/.*"
        - "POST /orders/.*"
    name:
      to_attributes:
        rules:
          - ^GET /users/(?P<userId>[^/]+)$
          - ^POST /orders/(?P<orderId>[^/]+)$
        break_after_match: true
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

    # Keep the actual user_id out of the span name. Only add it as an
    # attribute if your backend policy allows this cardinality.
    span.set_attribute("user.id", user_id)

    return fetch_user(user_id)
```

```javascript
// Node.js / Express
const { trace } = require('@opentelemetry/api');

app.get('/users/:userId', (req, res) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.updateName('GET /users/{userId}');
    span.setAttribute('user.id', req.params.userId);
  }

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
- Degraded performance in span-to-metrics components if span name is used as a dimension

Always keep span names at a bounded cardinality. Dynamic values belong in span attributes, not span names. A good rule of thumb: if you have more than a few hundred unique span names across your entire system, something needs normalization.
