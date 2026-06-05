# How to Use OTTL to Set span.name Based on HTTP Method and Route Template

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
          # Only for server spans that have both attributes
          - set(span.name, Concat([span.attributes["http.request.method"], " ", span.attributes["http.route"]], "")) where span.kind == SPAN_KIND_SERVER and span.attributes["http.request.method"] != nil and span.attributes["http.route"] != nil
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
          - set(span.name, Concat([span.attributes["http.request.method"], " ", span.attributes["http.route"]], "")) where span.kind == SPAN_KIND_SERVER and span.attributes["http.request.method"] != nil and span.attributes["http.route"] != nil

          # Fallback for older instrumentation: use http.url with dynamic segments replaced
          # First normalize the URL
          - replace_pattern(span.attributes["http.url"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}") where span.attributes["http.url"] != nil
          - replace_pattern(span.attributes["http.url"], "/[0-9]+", "/{id}") where span.attributes["http.url"] != nil

          # Strip query params and domain from URL
          - replace_pattern(span.attributes["http.url"], "\\?.*$$", "") where span.attributes["http.url"] != nil
          - replace_pattern(span.attributes["http.url"], "^https?://[^/]+", "") where span.attributes["http.url"] != nil

          # Then use it as span name if route is not available
          - set(span.name, Concat([span.attributes["http.method"], " ", span.attributes["http.url"]], "")) where span.kind == SPAN_KIND_SERVER and span.attributes["http.request.method"] == nil and span.attributes["http.method"] != nil and span.attributes["http.route"] == nil and span.attributes["http.url"] != nil
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
          - set(span.name, Concat([span.attributes["http.request.method"], " ", span.attributes["http.route"]], "")) where span.kind == SPAN_KIND_SERVER and span.attributes["http.request.method"] != nil and span.attributes["http.route"] != nil

          # Old convention fallback: http.method + http.route
          - set(span.name, Concat([span.attributes["http.method"], " ", span.attributes["http.route"]], "")) where span.kind == SPAN_KIND_SERVER and span.attributes["http.request.method"] == nil and span.attributes["http.method"] != nil and span.attributes["http.route"] != nil
```

## Naming Database Spans

Apply the same pattern for database spans:

```yaml
processors:
  transform/db_span_names:
    trace_statements:
      - context: span
        statements:
          # Set database span names from operation and collection/table
          # Format: "SELECT users" instead of raw SQL
          - set(span.name, Concat([span.attributes["db.operation.name"], " ", span.attributes["db.collection.name"]], "")) where span.attributes["db.operation.name"] != nil and span.attributes["db.collection.name"] != nil

          # Fallback: just the operation
          - set(span.name, span.attributes["db.operation.name"]) where span.attributes["db.operation.name"] != nil and span.attributes["db.collection.name"] == nil and span.name == ""
```

## Naming gRPC Spans

```yaml
processors:
  transform/grpc_span_names:
    trace_statements:
      - context: span
        statements:
          # gRPC spans: use the full method path
          # rpc.method -> "UserService/GetUser"
          - set(span.name, span.attributes["rpc.method"]) where span.attributes["rpc.system.name"] == "grpc" and span.attributes["rpc.method"] != nil
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
          - set(span.name, Concat([span.attributes["http.request.method"], " ", span.attributes["http.route"]], "")) where span.kind == SPAN_KIND_SERVER and span.attributes["http.request.method"] != nil and span.attributes["http.route"] != nil

          # Old HTTP server fallback: method + route
          - set(span.name, Concat([span.attributes["http.method"], " ", span.attributes["http.route"]], "")) where span.kind == SPAN_KIND_SERVER and span.attributes["http.request.method"] == nil and span.attributes["http.method"] != nil and span.attributes["http.route"] != nil

          # HTTP client spans: method + URL template
          - set(span.name, Concat([span.attributes["http.request.method"], " ", span.attributes["url.template"]], "")) where span.kind == SPAN_KIND_CLIENT and span.attributes["http.request.method"] != nil and span.attributes["url.template"] != nil

          # gRPC spans: service/method
          - set(span.name, span.attributes["rpc.method"]) where span.attributes["rpc.system.name"] == "grpc" and span.attributes["rpc.method"] != nil

          # Database spans: operation table
          - set(span.name, Concat([span.attributes["db.operation.name"], " ", span.attributes["db.collection.name"]], "")) where span.attributes["db.system.name"] != nil and span.attributes["db.operation.name"] != nil and span.attributes["db.collection.name"] != nil

          # Messaging spans: operation destination
          - set(span.name, Concat([span.attributes["messaging.operation.name"], " ", span.attributes["messaging.destination.name"]], "")) where span.attributes["messaging.system"] != nil and span.attributes["messaging.operation.name"] != nil and span.attributes["messaging.destination.name"] != nil

          # Fallback for HTTP spans without route: normalize the URL
          - replace_pattern(span.attributes["http.url"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}") where span.attributes["http.url"] != nil and span.attributes["http.route"] == nil
          - replace_pattern(span.attributes["http.url"], "/[0-9]+", "/{id}") where span.attributes["http.url"] != nil and span.attributes["http.route"] == nil
          - replace_pattern(span.attributes["http.url"], "\\?.*$$", "") where span.attributes["http.url"] != nil
          - replace_pattern(span.attributes["http.url"], "^https?://[^/]+", "") where span.attributes["http.url"] != nil
          - set(span.name, Concat([span.attributes["http.method"], " ", span.attributes["http.url"]], "")) where span.kind == SPAN_KIND_SERVER and span.attributes["http.request.method"] == nil and span.attributes["http.method"] != nil and span.attributes["http.route"] == nil and span.attributes["http.url"] != nil

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
