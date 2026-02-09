# How to Write OTTL Regex Replace Patterns to Normalize URL Paths and Remove Dynamic Segments from Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, URL Normalization, Regex

Description: Use OTTL regex replace patterns to normalize URL paths and remove dynamic segments like IDs from spans for better trace grouping.

Dynamic URL segments like user IDs, order numbers, and UUIDs create high-cardinality span names that make trace grouping impossible. Instead of seeing one entry for "GET /api/users/{id}", you see thousands of entries like "GET /api/users/123", "GET /api/users/456", and so on. URL normalization in the Collector replaces these dynamic segments with placeholders, producing clean, groupable span names.

## The High-Cardinality Problem

Without normalization, your trace backend shows:

```
GET /api/users/abc123def     - 3 traces
GET /api/users/xyz789ghi     - 2 traces
GET /api/users/mno456pqr     - 1 trace
GET /api/orders/12345        - 4 traces
GET /api/orders/67890        - 2 traces
...thousands more unique entries...
```

After normalization:

```
GET /api/users/{userId}      - 6 traces
GET /api/orders/{orderId}    - 6 traces
```

## Using replace_pattern for URL Normalization

The `replace_pattern` function takes a regex pattern and a replacement string:

```yaml
processors:
  transform/normalize_urls:
    trace_statements:
      - context: span
        statements:
          # Replace UUIDs in URL paths
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}")

          # Replace numeric IDs
          - replace_pattern(attributes["http.url"], "/[0-9]+", "/{id}")

          # Replace MongoDB ObjectIDs (24 hex characters)
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{24}", "/{objectId}")

          # Replace base64-encoded tokens in URLs
          - replace_pattern(attributes["http.url"], "/[A-Za-z0-9+/=]{20,}", "/{token}")
```

## Normalizing http.route and span.name

In addition to `http.url`, normalize `http.route` and the span name:

```yaml
processors:
  transform/normalize_all:
    trace_statements:
      - context: span
        statements:
          # Normalize http.route attribute
          - replace_pattern(attributes["http.route"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}")
          - replace_pattern(attributes["http.route"], "/[0-9]+", "/{id}")

          # Normalize http.url attribute
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}")
          - replace_pattern(attributes["http.url"], "/[0-9]+", "/{id}")

          # Normalize span name (often includes the URL path)
          - replace_pattern(name, "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}")
          - replace_pattern(name, "/[0-9]+", "/{id}")
```

## Order of Replacement Matters

Apply more specific patterns before generic ones:

```yaml
processors:
  transform/ordered_normalize:
    trace_statements:
      - context: span
        statements:
          # Step 1: Replace UUIDs first (most specific)
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}")

          # Step 2: Replace MongoDB ObjectIDs
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{24}", "/{objectId}")

          # Step 3: Replace long hex strings (API keys, hashes)
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{16,}", "/{hash}")

          # Step 4: Replace numeric IDs last (most generic)
          # This runs after UUIDs and ObjectIDs are already replaced,
          # so it won't interfere with them
          - replace_pattern(attributes["http.url"], "/[0-9]+", "/{id}")
```

If you run the numeric ID replacement first, it would partially match UUIDs and produce broken placeholders.

## Removing Query Parameters

Query strings add even more cardinality. Strip them or normalize them:

```yaml
processors:
  transform/strip_query:
    trace_statements:
      - context: span
        statements:
          # Remove everything after the question mark in URLs
          - replace_pattern(attributes["http.url"], "\\?.*$", "")

          # Or keep the query parameter names but remove values
          - replace_pattern(attributes["http.url"], "=([^&]*)", "={value}")
```

## Handling Specific Route Patterns

For routes that follow known patterns, use more targeted replacements:

```yaml
processors:
  transform/specific_routes:
    trace_statements:
      - context: span
        statements:
          # Normalize: /api/v1/users/123/orders/456
          # To:        /api/v1/users/{userId}/orders/{orderId}
          - replace_pattern(attributes["http.url"], "/users/[^/]+", "/users/{userId}")
          - replace_pattern(attributes["http.url"], "/orders/[^/]+", "/orders/{orderId}")
          - replace_pattern(attributes["http.url"], "/products/[^/]+", "/products/{productId}")

          # Normalize span name to match
          - replace_pattern(name, "/users/[^/]+", "/users/{userId}")
          - replace_pattern(name, "/orders/[^/]+", "/orders/{orderId}")
          - replace_pattern(name, "/products/[^/]+", "/products/{productId}")
```

## Preserving the Original URL

If you need the original URL for debugging, save it before normalizing:

```yaml
processors:
  transform/preserve_and_normalize:
    trace_statements:
      - context: span
        statements:
          # Save original URL before normalization
          - set(attributes["http.url.original"], attributes["http.url"]) where attributes["http.url"] != nil

          # Then normalize
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}")
          - replace_pattern(attributes["http.url"], "/[0-9]+", "/{id}")
```

## Full Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/normalize:
    trace_statements:
      - context: span
        statements:
          # UUID normalization
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}")
          - replace_pattern(attributes["http.route"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}")
          - replace_pattern(name, "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}")

          # Numeric ID normalization
          - replace_pattern(attributes["http.url"], "/[0-9]+", "/{id}")
          - replace_pattern(attributes["http.route"], "/[0-9]+", "/{id}")
          - replace_pattern(name, "/[0-9]+", "/{id}")

          # Strip query parameters from URL
          - replace_pattern(attributes["http.url"], "\\?.*$", "")

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
      processors: [transform/normalize, batch]
      exporters: [otlp]
```

URL normalization is one of the highest-impact OTTL transformations you can apply. It reduces span name cardinality from thousands of unique values to a manageable set of route templates, making your trace analytics meaningful and your dashboards usable.
