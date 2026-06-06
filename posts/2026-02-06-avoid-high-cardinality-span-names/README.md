# How to Avoid the Anti-Pattern of Putting High-Cardinality Values in Span Names

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Name, Cardinality, Performance

Description: Learn why high-cardinality span names destroy your tracing backend performance and how to use attributes correctly instead.

Span names are meant to be low-cardinality identifiers that group similar operations together. When you put user IDs, request IDs, timestamps, or full URLs into span names, you create a unique name for nearly every span. This overwhelms your tracing backend's indexing, makes aggregation impossible, and can dramatically increase storage costs.

## What High Cardinality Means

Cardinality refers to the number of unique values a field can have. A field like `http.method` has low cardinality because there are only a handful of HTTP methods (GET, POST, PUT, DELETE, etc.). A field like `user.id` has high cardinality because there could be millions of unique values.

Span names should behave like `http.method`, not like `user.id`.

## The Problem in Practice

```python
# Bad - every user gets a unique span name

from opentelemetry import trace

tracer = trace.get_tracer("user-service")

def get_user(user_id):
    with tracer.start_as_current_span(f"get_user_{user_id}") as span:
        return db.query(f"SELECT * FROM users WHERE id = {user_id}")
```

If you have 100,000 users, this creates 100,000 unique span names. Many tracing backends index or group by span name, so this can create a large number of distinct indexed values. Queries like "show me the average latency for user lookups" become impractical because each lookup has a different name.

## More Examples of High-Cardinality Span Names

```javascript
// Bad - full URL path with variable segments
span = tracer.startSpan(`GET /api/users/${userId}/orders/${orderId}`);

// Bad - timestamp in span name
span = tracer.startSpan(`scheduled_job_${Date.now()}`);

// Bad - request ID in span name
span = tracer.startSpan(`handle_request_${req.headers['x-request-id']}`);

// Bad - query string in span name
span = tracer.startSpan(`search_${req.query.q}`);
```

## The Correct Pattern

Use a fixed, descriptive span name and put variable data into span attributes:

```python
from opentelemetry import trace

tracer = trace.get_tracer("user-service")

def get_user(user_id):
    # Good - fixed span name with variable data in attributes
    with tracer.start_as_current_span("get_user") as span:
        span.set_attribute("user.id", user_id)
        return db.query(f"SELECT * FROM users WHERE id = {user_id}")
```

```javascript
// Good - parameterized route as span name, specifics in attributes
const routeSpan = tracer.startSpan('GET /api/users/:userId/orders/:orderId');
routeSpan.setAttribute('user.id', userId);
routeSpan.setAttribute('order.id', orderId);

// Good - fixed job name with run metadata in attributes
const jobSpan = tracer.startSpan('scheduled_job');
jobSpan.setAttribute('job.run_timestamp', Date.now());

// Good - fixed operation name with search term as attribute
const searchSpan = tracer.startSpan('search');
searchSpan.setAttribute('search.query', req.query.q);
```

## How HTTP Instrumentations Handle This

The built-in HTTP instrumentations follow this pattern already. They use the HTTP method and route template as the span name:

```text
GET /api/users/:id    (good - parameterized)
GET /api/users/12345  (bad - specific ID in name)
```

If you see specific IDs in your HTTP span names, check that your router instrumentation is correctly extracting the route template. For Express:

```javascript
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

registerInstrumentations({
    instrumentations: [
        // Express instrumentation expects the HTTP layer to be instrumented
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
    ],
});

// Express instrumentation sets http.route from the matched route template
// GET /api/users/:id instead of GET /api/users/12345
```

## Impact on Your Backend

Here is what high-cardinality span names do to popular tracing backends:

**Index bloat**: In backends that index span names, each unique span name can create an entry in the name index. With millions of unique names, the index can grow significantly, slowing down queries.

**Aggregation failures**: It becomes impractical to compute "p99 latency for user lookups" by span name when every lookup has a different name. You would need to search across many span names or rely on a separate normalized field.

**UI performance**: Dropdown menus and autocomplete for span names become unusable when there are millions of options.

**Storage costs**: Backends that index span names or derive metrics from spans may store more metadata or create more series when span names have high cardinality. This can increase cost, depending on the backend's billing and storage model.

## A Naming Convention

Adopt a consistent naming scheme for your spans:

```text
<verb>_<noun>           # process_order, validate_token
<NOUN> <verb>           # HTTP GET, DB query (for infrastructure spans)
<component>.<operation> # cache.get, queue.publish
```

Keep it to a fixed set of names that describe the type of operation, not the specific instance.

## Automated Detection

You can detect high-cardinality span names by querying your tracing backend:

```sql
-- Check for span names that appear only once (likely high-cardinality)
SELECT span_name, COUNT(*) as count
FROM spans
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY span_name
HAVING count = 1
ORDER BY span_name
LIMIT 100;
```

If this query returns thousands of results, you have a cardinality problem.

The rule is simple: span names should describe the class of operation, and attributes should describe the specific instance. Follow this rule and your tracing backend will thank you.
