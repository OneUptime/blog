# How to Chain Multiple OTTL Statements in the Transform Processor for Complex Multi-Step Transformations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Transform Processor, Multi-Step

Description: Chain multiple OTTL statements in the transform processor to build complex multi-step telemetry transformations in the Collector pipeline.

Real-world telemetry transformations rarely need just one OTTL statement. You typically need a sequence of operations: parse structured data, extract fields, normalize values, compute derived attributes, and clean up temporary values. OTTL statements in the transform processor execute sequentially, which means each statement can build on the results of previous ones. Understanding this execution model is key to building complex transformations.

## Execution Order

Statements within a single context block execute in order, from top to bottom. The output of one statement becomes the input to the next:

```yaml
processors:
  transform/sequential:
    trace_statements:
      - context: span
        statements:
          # Statement 1: runs first
          - set(attributes["step"], "one")
          # Statement 2: runs second, can see the result of statement 1
          - set(attributes["step"], Concat([attributes["step"], "-two"], ""))
          # Statement 3: runs third
          - set(attributes["step"], Concat([attributes["step"], "-three"], ""))
          # Final value of attributes["step"] is "one-two-three"
```

## Multi-Step URL Normalization and Span Naming

A realistic example that normalizes a URL and builds a span name from it:

```yaml
processors:
  transform/url_pipeline:
    trace_statements:
      - context: span
        statements:
          # Step 1: Save the original URL for debugging
          - set(attributes["http.url.original"], attributes["http.url"]) where attributes["http.url"] != nil

          # Step 2: Strip query parameters
          - replace_pattern(attributes["http.url"], "\\?.*$", "") where attributes["http.url"] != nil

          # Step 3: Strip the domain/scheme
          - replace_pattern(attributes["http.url"], "^https?://[^/]+", "") where attributes["http.url"] != nil

          # Step 4: Replace UUIDs with placeholders
          - replace_pattern(attributes["http.url"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}") where attributes["http.url"] != nil

          # Step 5: Replace numeric IDs
          - replace_pattern(attributes["http.url"], "/[0-9]+", "/{id}") where attributes["http.url"] != nil

          # Step 6: Set the normalized URL as http.route if not already set
          - set(attributes["http.route"], attributes["http.url"]) where attributes["http.route"] == nil and attributes["http.url"] != nil

          # Step 7: Build span name from method + normalized route
          - set(name, Concat([attributes["http.method"], " ", attributes["http.route"]], "")) where attributes["http.method"] != nil and attributes["http.route"] != nil

          # Step 8: Classify the endpoint
          - set(attributes["endpoint.category"], "api") where IsMatch(attributes["http.route"], "^/api/.*")
          - set(attributes["endpoint.category"], "webhook") where IsMatch(attributes["http.route"], "^/webhooks?/.*")
          - set(attributes["endpoint.category"], "internal") where IsMatch(attributes["http.route"], "^/(health|ready|metrics).*")
          - set(attributes["endpoint.category"], "other") where attributes["endpoint.category"] == nil and attributes["http.route"] != nil
```

## Multi-Step Log Processing

Parse, extract, enrich, and clean log records:

```yaml
processors:
  transform/log_pipeline:
    log_statements:
      - context: log
        statements:
          # Step 1: Parse JSON body if present
          - set(cache, ParseJSON(body)) where IsString(body)

          # Step 2: Extract fields into attributes
          - set(attributes["request.id"], cache["request_id"]) where cache["request_id"] != nil
          - set(attributes["user.id"], cache["user"]["id"]) where cache["user"]["id"] != nil
          - set(attributes["error.code"], cache["error"]["code"]) where cache["error"]["code"] != nil
          - set(attributes["duration_ms"], cache["duration_ms"]) where cache["duration_ms"] != nil

          # Step 3: Set severity from parsed data
          - set(severity_text, cache["level"]) where cache["level"] != nil
          - set(severity_number, 5) where IsMatch(severity_text, "(?i)^debug$")
          - set(severity_number, 9) where IsMatch(severity_text, "(?i)^info$")
          - set(severity_number, 13) where IsMatch(severity_text, "(?i)^warn(ing)?$")
          - set(severity_number, 17) where IsMatch(severity_text, "(?i)^err(or)?$")
          - set(severity_number, 21) where IsMatch(severity_text, "(?i)^(fatal|critical)$")

          # Step 4: Set clean message as body
          - set(body, cache["message"]) where cache["message"] != nil

          # Step 5: Compute derived attributes
          - set(attributes["is_slow"], true) where attributes["duration_ms"] != nil and attributes["duration_ms"] > 1000
          - set(attributes["has_error"], true) where severity_number >= 17
          - set(attributes["needs_attention"], true) where attributes["is_slow"] == true or attributes["has_error"] == true

          # Step 6: Truncate large attributes
          - truncate_all(attributes, 512)

          # Step 7: Add processing metadata
          - set(attributes["processed_by"], "otel-collector")
```

## Chaining Across Multiple Context Blocks

You can have multiple context blocks. They execute in order, and each operates at its specified context level:

```yaml
processors:
  transform/multi_context:
    trace_statements:
      # Context 1: Resource-level operations
      - context: resource
        statements:
          - set(attributes["cluster"], "production-us-east")
          - truncate_all(attributes, 128)

      # Context 2: Span-level operations (runs after resource context)
      - context: span
        statements:
          - set(attributes["cluster"], resource.attributes["cluster"]) where resource.attributes["cluster"] != nil
          - set(name, Concat([attributes["http.method"], " ", attributes["http.route"]], "")) where attributes["http.method"] != nil and attributes["http.route"] != nil

      # Context 3: Span event operations (runs after span context)
      - context: spanevent
        statements:
          - truncate_all(attributes, 256)
          - delete_key(attributes, "exception.stacktrace") where Len(attributes["exception.stacktrace"]) > 5000
```

## Multi-Step Error Enrichment

A complex error handling pipeline:

```yaml
processors:
  transform/error_pipeline:
    trace_statements:
      - context: span
        statements:
          # Step 1: Set error status from HTTP codes
          - set(status.code, 2) where attributes["http.response.status_code"] >= 500
          - set(status.code, 2) where attributes["http.response.status_code"] >= 400 and attributes["http.response.status_code"] != 404

          # Step 2: Categorize the error
          - set(attributes["error.category"], "server_error") where attributes["http.response.status_code"] >= 500
          - set(attributes["error.category"], "client_error") where attributes["http.response.status_code"] >= 400 and attributes["http.response.status_code"] < 500
          - set(attributes["error.category"], "timeout") where IsMatch(attributes["exception.type"], "(?i).*timeout.*")
          - set(attributes["error.category"], "connection") where IsMatch(attributes["exception.type"], "(?i).*connection.*")

          # Step 3: Set alert priority based on category and service
          - set(attributes["alert.priority"], "critical") where attributes["error.category"] == "server_error" and resource.attributes["deployment.environment"] == "production"
          - set(attributes["alert.priority"], "high") where attributes["error.category"] == "timeout" and resource.attributes["deployment.environment"] == "production"
          - set(attributes["alert.priority"], "medium") where attributes["error.category"] == "client_error"
          - set(attributes["alert.priority"], "low") where attributes["alert.priority"] == nil and status.code == 2

          # Step 4: Build error summary
          - set(attributes["error.summary"], Concat([attributes["error.category"], " - ", attributes["exception.type"]], "")) where status.code == 2 and attributes["exception.type"] != nil
          - set(attributes["error.summary"], Concat([attributes["error.category"], " - HTTP ", attributes["http.response.status_code"]], "")) where status.code == 2 and attributes["exception.type"] == nil and attributes["http.response.status_code"] != nil

          # Step 5: Set status message
          - set(status.message, attributes["error.summary"]) where status.code == 2 and attributes["error.summary"] != nil
```

## Using Multiple Transform Processors

For very complex pipelines, split logic into multiple transform processors:

```yaml
processors:
  transform/step1_parse:
    trace_statements:
      - context: span
        statements:
          - replace_pattern(attributes["http.url"], "\\?.*$", "")
          - replace_pattern(attributes["http.url"], "/[0-9]+", "/{id}")

  transform/step2_enrich:
    trace_statements:
      - context: span
        statements:
          - set(name, Concat([attributes["http.method"], " ", attributes["http.url"]], ""))
          - set(attributes["endpoint.type"], "api") where IsMatch(attributes["http.url"], "^/api/.*")

  transform/step3_cleanup:
    trace_statements:
      - context: span
        statements:
          - truncate_all(attributes, 512)
          - delete_key(attributes, "http.url.original")

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/step1_parse, transform/step2_enrich, transform/step3_cleanup, batch]
      exporters: [otlp]
```

Splitting into multiple transform processors makes the configuration easier to read, test, and maintain. Each processor has a clear responsibility, and you can enable or disable individual steps independently.

## Debugging Multi-Step Transformations

When a multi-step transformation produces unexpected results, add temporary debug attributes:

```yaml
- set(attributes["_debug.after_step1"], attributes["http.url"])
# ... more steps ...
- set(attributes["_debug.after_step5"], name)
```

Export to the debug exporter to see intermediate values, then remove the debug attributes once you have identified the issue.

Chaining OTTL statements is the natural way to build sophisticated telemetry transformations. Each statement is simple on its own, but the sequential execution model lets you compose them into powerful pipelines that parse, enrich, normalize, and clean your telemetry data.
