# How to Avoid the Anti-Pattern of Putting High-Cardinality Values in Span Names Instead of Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Names, Cardinality, Performance

Description: Learn why high-cardinality span names destroy your tracing backend performance and how to use attributes correctly instead.

Span names are meant to be low-cardinality identifiers that group similar operations together. When you put user IDs, request IDs, timestamps, or full URLs into span names, you create a unique name for nearly every span. This overwhelms your tracing backend's indexing, makes aggregation impossible, and can dramatically increase storage costs.

## What High Cardinality Means

Cardinality refers to the number of unique values a field can have. A field like `http.method` has low cardinality because there are only a handful of HTTP methods (GET, POST, PUT, DELETE, etc.). A field like `user.id` has high cardinality because there could be millions of unique values.

Span names should behave like `http.method`, not like `user.id`.

## The Problem in Practice

```python
# Bad - every user gets a unique span name
tracer = trace.get_tracer("user-service")

def get_user(user_id):
    with tracer.start_as_current_span(f"get_user_{user_id}") as span:
        return db.query(f"SELECT * FROM users WHERE id = {user_id}")
```

If you have 100,000 users, this creates 100,000 unique span names. Your tracing backend stores each unique span name in its index. Queries like "show me the average latency for user lookups" become impossible because each lookup has a different name.

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
const span = tracer.startSpan('GET /api/users/:userId/orders/:orderId');
span.setAttribute('user.id', userId);
span.setAttribute('order.id', orderId);

// Good - fixed job name with run metadata in attributes
const span = tracer.startSpan('scheduled_job');
span.setAttribute('job.run_timestamp', Date.now());

// Good - fixed operation name with search term as attribute
const span = tracer.startSpan('search');
span.setAttribute('search.query', req.query.q);
```

## How HTTP Instrumentations Handle This

The built-in HTTP instrumentations follow this pattern already. They use the HTTP method and route template as the span name:

```
GET /api/users/:id    (good - parameterized)
GET /api/users/12345  (bad - specific ID in name)
```

If you see specific IDs in your HTTP span names, check that your router instrumentation is correctly extracting the route template. For Express:

```javascript
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

// Express instrumentation automatically uses route templates
// GET /api/users/:id instead of GET /api/users/12345
```

## Impact on Your Backend

Here is what high-cardinality span names do to popular tracing backends:

**Index bloat**: Each unique span name creates an entry in the name index. With millions of unique names, the index grows into gigabytes, slowing down all queries.

**Aggregation failures**: You cannot compute "p99 latency for user lookups" when every lookup has a different name. You would need to search across millions of span names.

**UI performance**: Dropdown menus and autocomplete for span names become unusable when there are millions of options.

**Storage costs**: Many backends charge based on the number of unique time series or span names. High cardinality directly increases your bill.

## A Naming Convention

Adopt a consistent naming scheme for your spans:

```
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
WHERE timestamp > NOW() - INTERVAL 1 HOUR
GROUP BY span_name
HAVING count = 1
ORDER BY span_name
LIMIT 100;
```

If this query returns thousands of results, you have a cardinality problem.

The rule is simple: span names should describe the class of operation, and attributes should describe the specific instance. Follow this rule and your tracing backend will thank you.
