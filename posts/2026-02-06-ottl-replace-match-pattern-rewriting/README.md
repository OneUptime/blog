# How to Use OTTL replace_match and replace_all_matches for Pattern-Based

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Transform Processor, Pattern Matching

Description: Use OTTL replace_match and replace_all_matches functions to rewrite attribute values in spans using pattern-based matching in the Collector.

Telemetry data often contains attribute values that need cleanup or normalization. URLs with session tokens, email addresses in user identifiers, or inconsistent service version formats all benefit from pattern-based rewriting. The OTTL functions `replace_match` and `replace_all_matches` let you do this in the Collector's transform processor without touching application code.

## replace_match vs replace_all_matches

- **replace_match**: Operates on a single attribute. If the attribute value matches the pattern, it is replaced.
- **replace_all_matches**: Operates on a map such as span or resource attributes. Every string value in the map whose entire value matches the pattern gets replaced.

## Basic replace_match Usage

```yaml
processors:
  transform/rewrite:
    trace_statements:
      # Replace a specific attribute value if it matches a glob pattern
      # Pattern uses * for wildcard matching within a path segment
      - replace_match(span.attributes["http.target"], "/session/*", "/session/REDACTED")
```

The `replace_match` function uses Go `filepath.Match`-style patterns (not regex). The `*` matches any sequence of non-separator characters, and the pattern must match the whole string.

## Practical Examples

### Redacting Sensitive URL Parameters

```yaml
processors:
  transform/redact_urls:
    trace_statements:
      # Replace query strings that contain a session token
      - replace_match(span.attributes["url.query"], "*token=*", "token=REDACTED")

      # Replace query strings that contain an API key
      - replace_match(span.attributes["url.query"], "*api_key=*", "api_key=REDACTED")

      # Normalize OAuth callback URLs
      - replace_match(span.attributes["url.path"], "/oauth/callback", "/oauth/callback")
      - replace_match(span.attributes["url.query"], "*code=*", "code=REDACTED")
```

### Normalizing Service Names

```yaml
processors:
  transform/normalize:
    trace_statements:
      # Standardize service version formats
      # "v1.2.3" -> "1.2.3"
      - replace_pattern(resource.attributes["service.version"], "^v", "")

      # Normalize environment names
      - replace_match(resource.attributes["deployment.environment"], "prod*", "production")
      - replace_match(resource.attributes["deployment.environment"], "stg*", "staging")
      - replace_match(resource.attributes["deployment.environment"], "dev*", "development")
```

### Cleaning Database Statements

```yaml
processors:
  transform/clean_db:
    trace_statements:
      # Replace simple SQL statement shapes with placeholders
      # This is a simple approach - for complex SQL, use replace_pattern
      # with carefully tested regexes or a custom processor
      - replace_match(span.attributes["db.statement"], "SELECT * FROM users WHERE id = *", "SELECT * FROM users WHERE id = ?")
      - replace_match(span.attributes["db.statement"], "INSERT INTO users VALUES (*)", "INSERT INTO users VALUES (?)")
```

## Using replace_all_matches

`replace_all_matches` applies the replacement across all attributes on a span:

```yaml
processors:
  transform/global_redact:
    trace_statements:
      # Redact email-like values from ALL span attributes
      # Any string attribute value whose full value matches the pattern gets replaced
      - replace_all_matches(span.attributes, "*@*.com", "REDACTED_EMAIL")
      - replace_all_matches(span.attributes, "*@*.org", "REDACTED_EMAIL")
      - replace_all_matches(span.attributes, "*@*.io", "REDACTED_EMAIL")
```

This is powerful but should be used carefully. It scans every attribute value on every span, which has a performance cost.

## Log Body Rewriting

OTTL works on logs too:

```yaml
processors:
  transform/log_rewrite:
    log_statements:
      # Redact log bodies that contain an IP marker (glob pattern)
      - replace_match(log.body, "IP: *.*.*.*, message=*", "IP: REDACTED")

      # Clean up log source names
      - replace_match(resource.attributes["log.source"], "/var/log/*/app.log", "app.log")
```

## Full Configuration Example

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/rewrite:
    trace_statements:
      # Normalize URL paths by removing UUIDs
      - replace_match(span.attributes["url.path"], "/users/????????-????-????-????-????????????/profile", "/users/{userId}/profile")

      # Redact bearer tokens from recorded headers
      - replace_match(span.attributes["http.request.header.authorization"], "Bearer *", "Bearer [REDACTED]")

      # Normalize database names across environments
      - replace_match(span.attributes["db.name"], "*_staging", "app_db")
      - replace_match(span.attributes["db.name"], "*_production", "app_db")
      - replace_match(span.attributes["db.name"], "*_development", "app_db")

    log_statements:
      # Replace log bodies that contain a card_number field
      - replace_match(log.body, "card_number=*", "card_number=[REDACTED]")

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
      processors: [transform/rewrite, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [transform/rewrite, batch]
      exporters: [otlp]
```

## Limitations of Glob Patterns

The `replace_match` function uses glob patterns, not regular expressions. This means:

- `*` matches any sequence of non-separator characters
- `?` matches a single non-separator character
- Character classes like `[a-z]` are supported by `filepath.Match`
- No support for quantifiers like `{3,5}`
- No capture groups

For more complex pattern matching, use the `replace_pattern` function which supports regex:

```yaml
processors:
  transform/regex:
    trace_statements:
      # Use regex for more precise matching
      - replace_pattern(span.attributes["url.path"], "/users/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/users/{userId}")

      # Remove numeric IDs from URL paths
      - replace_pattern(span.attributes["url.path"], "/orders/[0-9]+", "/orders/{orderId}")
```

## Performance Considerations

Pattern-based rewriting adds processing time to every span:

1. **Be specific with conditions.** Add `where` clauses to limit which spans are processed:

```yaml
- replace_match(span.attributes["url.query"], "token=*", "token=REDACTED") where span.attributes["url.query"] != nil
```

2. **Use conditions to avoid unnecessary work.** Independent transform statements execute in order, so use `where` clauses when you want to skip statements that cannot apply.

3. **Prefer replace_match over replace_all_matches.** Scanning a single known attribute is faster than scanning all attributes.

4. **Test with realistic load.** Pattern matching on high-throughput collectors can add measurable latency. Benchmark before deploying to production.

Pattern-based attribute rewriting in the Collector centralizes data cleanup and redaction. It catches sensitive data before it reaches your backend, regardless of which application or library generated the telemetry.
