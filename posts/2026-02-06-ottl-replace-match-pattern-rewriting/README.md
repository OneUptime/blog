# How to Use OTTL replace_match and replace_all_matches for Pattern-Based Attribute Value Rewriting in Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Transform Processor, Pattern Matching

Description: Use OTTL replace_match and replace_all_matches functions to rewrite attribute values in spans using pattern-based matching in the Collector.

Telemetry data often contains attribute values that need cleanup or normalization. URLs with session tokens, email addresses in user identifiers, or inconsistent service version formats all benefit from pattern-based rewriting. The OTTL functions `replace_match` and `replace_all_matches` let you do this in the Collector's transform processor without touching application code.

## replace_match vs replace_all_matches

- **replace_match**: Operates on a single attribute. If the attribute value matches the pattern, it is replaced.
- **replace_all_matches**: Operates on ALL attributes. Every attribute whose value matches the pattern gets replaced.

## Basic replace_match Usage

```yaml
processors:
  transform/rewrite:
    trace_statements:
      - context: span
        statements:
          # Replace a specific attribute value if it matches a glob pattern
          # Pattern uses * for wildcard matching
          - replace_match(attributes["http.url"], "*/session/*", "*/session/REDACTED")
```

The `replace_match` function uses glob-style patterns (not regex). The `*` matches any sequence of characters.

## Practical Examples

### Redacting Sensitive URL Parameters

```yaml
processors:
  transform/redact_urls:
    trace_statements:
      - context: span
        statements:
          # Remove session tokens from URLs
          - replace_match(attributes["http.url"], "*?token=*", "/redacted-token-url")

          # Remove API keys from query strings
          - replace_match(attributes["http.url"], "*api_key=*", "/redacted-api-key-url")

          # Normalize OAuth callback URLs
          - replace_match(attributes["http.url"], "*/oauth/callback?code=*", "/oauth/callback?code=REDACTED")
```

### Normalizing Service Names

```yaml
processors:
  transform/normalize:
    trace_statements:
      - context: span
        statements:
          # Standardize service version formats
          # "v1.2.3" -> "1.2.3"
          - replace_match(attributes["service.version"], "v*", "")

          # Normalize environment names
          - replace_match(attributes["deployment.environment"], "prod*", "production")
          - replace_match(attributes["deployment.environment"], "stg*", "staging")
          - replace_match(attributes["deployment.environment"], "dev*", "development")
```

### Cleaning Database Statements

```yaml
processors:
  transform/clean_db:
    trace_statements:
      - context: span
        statements:
          # Replace actual values in SQL queries with placeholders
          # This is a simple approach - for complex SQL, use the Collector's
          # attributes processor or a custom processor
          - replace_match(attributes["db.statement"], "WHERE id = *", "WHERE id = ?")
          - replace_match(attributes["db.statement"], "VALUES (*)", "VALUES (?)")
```

## Using replace_all_matches

`replace_all_matches` applies the replacement across all attributes on a span:

```yaml
processors:
  transform/global_redact:
    trace_statements:
      - context: span
        statements:
          # Redact email addresses from ALL span attributes
          # Any attribute value matching the pattern gets replaced
          - replace_all_matches(attributes, "*@*.com", "REDACTED_EMAIL")
          - replace_all_matches(attributes, "*@*.org", "REDACTED_EMAIL")
          - replace_all_matches(attributes, "*@*.io", "REDACTED_EMAIL")
```

This is powerful but should be used carefully. It scans every attribute value on every span, which has a performance cost.

## Log Body Rewriting

OTTL works on logs too:

```yaml
processors:
  transform/log_rewrite:
    log_statements:
      - context: log
        statements:
          # Redact IP addresses from log bodies (glob pattern)
          - replace_match(body, "*IP: *.*.*.*,*", "IP: REDACTED")

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
      - context: span
        statements:
          # Normalize URL paths by removing UUIDs
          - replace_match(attributes["http.url"], "*/users/????????-????-????-????-????????????/*", "/users/{userId}/")

          # Redact bearer tokens from recorded headers
          - replace_match(attributes["http.request.header.authorization"], "Bearer *", "Bearer [REDACTED]")

          # Normalize database names across environments
          - replace_match(attributes["db.name"], "*_staging", "app_db")
          - replace_match(attributes["db.name"], "*_production", "app_db")
          - replace_match(attributes["db.name"], "*_development", "app_db")

    log_statements:
      - context: log
        statements:
          # Replace credit card-like patterns in log bodies
          - replace_match(body, "*card_number=*", "card_number=[REDACTED]")

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

- `*` matches any sequence of characters
- `?` matches a single character
- No support for character classes like `[a-z]`
- No support for quantifiers like `{3,5}`
- No capture groups

For more complex pattern matching, use the `replace_pattern` function which supports regex:

```yaml
processors:
  transform/regex:
    trace_statements:
      - context: span
        statements:
          # Use regex for more precise matching
          - replace_pattern(attributes["http.url"], "/users/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/users/{userId}")

          # Remove numeric IDs from URL paths
          - replace_pattern(attributes["http.url"], "/orders/[0-9]+", "/orders/{orderId}")
```

## Performance Considerations

Pattern-based rewriting adds processing time to every span:

1. **Be specific with conditions.** Add `where` clauses to limit which spans are processed:

```yaml
- replace_match(attributes["http.url"], "*token=*", "/redacted") where attributes["http.url"] != nil
```

2. **Order statements by frequency.** Put the most commonly matching patterns first to take advantage of short-circuit evaluation.

3. **Prefer replace_match over replace_all_matches.** Scanning a single known attribute is faster than scanning all attributes.

4. **Test with realistic load.** Pattern matching on high-throughput collectors can add measurable latency. Benchmark before deploying to production.

Pattern-based attribute rewriting in the Collector centralizes data cleanup and redaction. It catches sensitive data before it reaches your backend, regardless of which application or library generated the telemetry.
