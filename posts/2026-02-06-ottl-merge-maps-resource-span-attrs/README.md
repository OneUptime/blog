# How to Use OTTL merge_maps to Combine Resource and Span Attributes in the Transform Processor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, merge_maps, Transform Processor

Description: Use the OTTL merge_maps function in the transform processor to combine resource attributes with span attributes for enriched telemetry.

The `merge_maps` function in OTTL copies attributes from one map into another. This is useful when you want to promote resource-level attributes down to the span level, combine attributes from different sources, or flatten nested attribute structures. It operates on maps (key-value collections) and supports different merge strategies for handling key conflicts.

## Why Merge Resource Attributes into Spans

Resource attributes describe the entity that produced the telemetry (service name, host, cloud region). Span attributes describe the specific operation. Some backends and query languages work better when all relevant attributes are on the span itself rather than split between resource and span. Merging them makes queries simpler.

## Basic merge_maps Syntax

```
merge_maps(target_map, source_map, strategy)
```

The strategy parameter controls conflict resolution:
- `"insert"`: Only add keys that do not exist in the target
- `"update"`: Only update keys that already exist in the target
- `"upsert"`: Add or update all keys (source wins for conflicts)

## Merging Resource Attributes into Span Attributes

```yaml
processors:
  transform/merge_resource:
    trace_statements:
      - context: span
        statements:
          # Copy all resource attributes into span attributes
          # Using "insert" strategy: do not overwrite existing span attributes
          - merge_maps(attributes, resource.attributes, "insert")
```

After this transform, every span will carry attributes like `service.name`, `host.name`, `cloud.region`, etc., in addition to its own span-level attributes.

## Selective Merging

If you do not want all resource attributes on every span (it would increase payload size), be selective:

```yaml
processors:
  transform/selective_merge:
    trace_statements:
      - context: span
        statements:
          # Copy only specific resource attributes
          - set(attributes["service.name"], resource.attributes["service.name"])
          - set(attributes["service.version"], resource.attributes["service.version"])
          - set(attributes["deployment.environment"], resource.attributes["deployment.environment"])
          - set(attributes["k8s.namespace.name"], resource.attributes["k8s.namespace.name"])
```

## Merge Strategies in Practice

### Insert: Safe Merging (No Overwrites)

```yaml
processors:
  transform/insert_merge:
    trace_statements:
      - context: span
        statements:
          # Only add resource attributes that the span does not already have
          # If the span has "host.name" set, the resource's "host.name" is skipped
          - merge_maps(attributes, resource.attributes, "insert")
```

Use case: Enrich spans with resource context without losing span-specific values.

### Upsert: Full Override Merge

```yaml
processors:
  transform/upsert_merge:
    trace_statements:
      - context: span
        statements:
          # Resource attributes override span attributes for matching keys
          - merge_maps(attributes, resource.attributes, "upsert")
```

Use case: Ensure resource metadata (like correct service name) takes precedence over any span-level values.

### Update: Only Refresh Existing Keys

```yaml
processors:
  transform/update_merge:
    trace_statements:
      - context: span
        statements:
          # Only update span attributes that already exist with resource values
          # Does not add new keys to the span
          - merge_maps(attributes, resource.attributes, "update")
```

Use case: Refresh values that the span already tracks without adding extra attributes.

## Merging Custom Maps

You can construct a map and merge it into attributes:

```yaml
processors:
  transform/custom_merge:
    trace_statements:
      - context: span
        statements:
          # Create a map of default attributes and merge into span
          - merge_maps(attributes, {"default.region": "us-east-1", "default.tier": "standard"}, "insert")
```

## Combining Multiple Merges

```yaml
processors:
  transform/multi_merge:
    trace_statements:
      - context: span
        statements:
          # Step 1: Merge resource attributes (insert only)
          - merge_maps(attributes, resource.attributes, "insert")

          # Step 2: Add computed attributes
          - set(attributes["span.full_name"], Concat([resource.attributes["service.name"], ".", name], ""))

          # Step 3: Merge a static map of defaults (insert only)
          - merge_maps(attributes, {"monitoring.team": "platform", "alert.priority": "medium"}, "insert")
```

## Working with Logs

`merge_maps` works in log contexts too:

```yaml
processors:
  transform/log_merge:
    log_statements:
      - context: log
        statements:
          # Merge resource attributes into log attributes
          - merge_maps(attributes, resource.attributes, "insert")

          # Useful for backends that query log attributes
          # but do not have easy access to resource attributes
```

## Full Configuration Example

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/enrich:
    trace_statements:
      - context: span
        statements:
          # Merge resource context into spans (safe: insert only)
          - merge_maps(attributes, resource.attributes, "insert")

    log_statements:
      - context: log
        statements:
          # Merge resource context into logs
          - merge_maps(attributes, resource.attributes, "insert")

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
      processors: [transform/enrich, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [transform/enrich, batch]
      exporters: [otlp]
```

## Performance Considerations

Merging resource attributes into every span increases the size of each span in the export payload. For a resource with 20 attributes and a service handling 10,000 spans per second, that is 200,000 extra attribute key-value pairs per second being serialized and transmitted.

To minimize the impact:

1. **Use selective merging** instead of `merge_maps` for the entire resource. Copy only the 3-5 attributes your queries actually need.

2. **Apply conditions** to limit which spans get enriched:

```yaml
- merge_maps(attributes, resource.attributes, "insert") where name != "health_check"
```

3. **Consider your backend's capabilities.** Many modern backends (like Honeycomb and Jaeger) can join resource and span attributes at query time, making Collector-side merging unnecessary.

The `merge_maps` function is a straightforward way to reshape your telemetry data in the Collector. It bridges the gap between how OpenTelemetry structures data (resource + span attributes) and how some backends or query patterns expect it (flat attribute sets on each span).
