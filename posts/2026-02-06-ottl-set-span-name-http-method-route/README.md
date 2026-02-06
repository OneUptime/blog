# How to Use OTTL to Set span.name Based on HTTP Method and Route Template for Better Trace Grouping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Span Name, Trace Grouping

Description: Use OTTL to set span names based on HTTP method and route template for meaningful trace grouping in your observability backend.

Span names are the primary grouping key in trace backends. When instrumentation libraries set span names to the raw URL path (like `/api/users/abc123`) instead of a route template, you end up with thousands of unique span names that cannot be grouped. OTTL statements in the transform processor let you construct clean span names from the HTTP method and route template, producing groupable trace data.

## The Span Naming Problem

Different instrumentation libraries set span names differently:

- Some use the full URL: `GET https://api.example.com/users/123?include=orders`
- Some use just the path: `/users/123`
- Some use the HTTP method: `HTTP GET`
- The ideal format: `GET /users/{id}`

When span names are inconsistent or include dynamic segments, your trace backend shows ungrouped, high-cardinality span entries.

## Setting Span Name from Method and Route

```yaml
processors:
  transform/span_names:
    trace_statements:
      - context: span
        statements:
          # Set span name from HTTP method + route template
          # Only for server spans (kind == 2) that have both attributes
          - set(name, Concat([attributes["http.method"], " ", attributes["http.route"]], "")) where kind == 2 and attributes["http.method"] != nil and attributes["http.route"] != nil
```

This transforms span names like:

| Before | After |
|--------|-------|
| `GET /api/users/123` | `GET /users/{id}` |
| `POST /api/orders` | `POST /orders` |
| `HTTP request` | `DELETE /users/{id}` |

## Handling Missing Route Templates

Not all spans have `http.route` set. For those, construct the name from the URL path after normalization:

```yaml
processors:
  transform/span_names_fallback:
    trace_statements:
      - context: span
        statements:
          # Primary: use http.route if available
          - set(name, Concat([attributes["http.method"], " ", attributes["http.route"]], "")) where kind == 2 and attributes["http.method"] != nil and attributes["http.route"] != nil

          # Fallback: use http.url with dynamic segments replaced
          # First normalize the URL
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}") where attributes["http.url"] != nil
          - replace_pattern(attributes["http.url"], "/[0-9]+", "/{id}") where attributes["http.url"] != nil

          # Strip query params and domain from URL
          - replace_pattern(attributes["http.url"], "\\?.*$", "") where attributes["http.url"] != nil
          - replace_pattern(attributes["http.url"], "^https?://[^/]+", "") where attributes["http.url"] != nil

          # Then use it as span name if route is not available
          - set(name, Concat([attributes["http.method"], " ", attributes["http.url"]], "")) where kind == 2 and attributes["http.method"] != nil and attributes["http.route"] == nil and attributes["http.url"] != nil
```

## Handling New HTTP Semantic Conventions

The newer semantic conventions use `http.request.method` instead of `http.method` and `url.path` instead of parts of `http.url`:

```yaml
processors:
  transform/new_conventions:
    trace_statements:
      - context: span
        statements:
          # New convention: http.request.method + http.route
          - set(name, Concat([attributes["http.request.method"], " ", attributes["http.route"]], "")) where kind == 2 and attributes["http.request.method"] != nil and attributes["http.route"] != nil

          # Old convention fallback: http.method + http.route
          - set(name, Concat([attributes["http.method"], " ", attributes["http.route"]], "")) where kind == 2 and attributes["http.request.method"] == nil and attributes["http.method"] != nil and attributes["http.route"] != nil
```

## Naming Database Spans

Apply the same pattern for database spans:

```yaml
processors:
  transform/db_span_names:
    trace_statements:
      - context: span
        statements:
          # Set database span names from operation and table
          # Format: "SELECT users" instead of raw SQL
          - set(name, Concat([attributes["db.operation"], " ", attributes["db.sql.table"]], "")) where attributes["db.operation"] != nil and attributes["db.sql.table"] != nil

          # Fallback: just the operation
          - set(name, attributes["db.operation"]) where attributes["db.operation"] != nil and attributes["db.sql.table"] == nil and name == ""
```

## Naming gRPC Spans

```yaml
processors:
  transform/grpc_span_names:
    trace_statements:
      - context: span
        statements:
          # gRPC spans: use the full method path
          # rpc.service + rpc.method -> "UserService/GetUser"
          - set(name, Concat([attributes["rpc.service"], "/", attributes["rpc.method"]], "")) where attributes["rpc.system"] == "grpc" and attributes["rpc.service"] != nil and attributes["rpc.method"] != nil
```

## Comprehensive Span Naming Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/span_names:
    trace_statements:
      - context: span
        statements:
          # HTTP server spans: method + route
          - set(name, Concat([attributes["http.method"], " ", attributes["http.route"]], "")) where kind == 2 and attributes["http.method"] != nil and attributes["http.route"] != nil

          # HTTP client spans: method + route (from client perspective)
          - set(name, Concat([attributes["http.method"], " ", attributes["http.route"]], "")) where kind == 3 and attributes["http.method"] != nil and attributes["http.route"] != nil

          # gRPC spans: service/method
          - set(name, Concat([attributes["rpc.service"], "/", attributes["rpc.method"]], "")) where attributes["rpc.system"] == "grpc" and attributes["rpc.service"] != nil and attributes["rpc.method"] != nil

          # Database spans: operation table
          - set(name, Concat([attributes["db.operation"], " ", attributes["db.sql.table"]], "")) where attributes["db.system"] != nil and attributes["db.operation"] != nil and attributes["db.sql.table"] != nil

          # Messaging spans: operation destination
          - set(name, Concat([attributes["messaging.operation"], " ", attributes["messaging.destination.name"]], "")) where attributes["messaging.system"] != nil and attributes["messaging.operation"] != nil

          # Fallback for HTTP spans without route: normalize the URL
          - replace_pattern(attributes["http.url"], "/[0-9]+", "/{id}") where attributes["http.url"] != nil and attributes["http.route"] == nil
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}") where attributes["http.url"] != nil and attributes["http.route"] == nil
          - replace_pattern(attributes["http.url"], "\\?.*$", "") where attributes["http.url"] != nil
          - replace_pattern(attributes["http.url"], "^https?://[^/]+", "") where attributes["http.url"] != nil
          - set(name, Concat([attributes["http.method"], " ", attributes["http.url"]], "")) where kind == 2 and attributes["http.method"] != nil and attributes["http.route"] == nil and attributes["http.url"] != nil

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/span_names, batch]
      exporters: [otlp]
```

## Verifying the Results

After deploying, check your trace backend for span name cardinality. You should see a significant reduction in unique span names and better grouping in service maps and latency histograms. If some spans still have ungrouped names, check the Collector debug logs to see which condition branches those spans are hitting.

Clean span names are the foundation of useful trace analytics. By standardizing span names in the Collector, you get consistent grouping across all your services regardless of which instrumentation libraries they use.
