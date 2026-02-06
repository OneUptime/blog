# How to Fix Elasticsearch Rejecting OpenTelemetry Data Due to Index Template Mapping Conflicts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Elasticsearch, Index Templates, Troubleshooting

Description: Fix Elasticsearch rejecting OpenTelemetry trace and log data caused by index template mapping conflicts with existing field definitions.

You configure the OpenTelemetry Collector to export traces or logs to Elasticsearch. The first batch succeeds, but then you start seeing errors:

```
mapper_parsing_exception: failed to parse field [attributes.http.status_code]
of type [long] in document with id 'xyz'. Preview of field's value: '200 OK'
```

Or:

```
illegal_argument_exception: mapper [resource.attributes.service.name]
cannot be changed from type [keyword] to [text]
```

Elasticsearch has inferred a field type from the first document it saw, and subsequent documents have a different type for the same field. Once a mapping is set, Elasticsearch does not allow changing it.

## Why Mapping Conflicts Happen

OpenTelemetry attributes are dynamically typed. A span might have `http.status_code` as an integer (200), while another span from a different service sends it as a string ("200 OK"). Elasticsearch creates the index mapping based on the first document and rejects anything that does not match.

Common conflicts:
- Integer vs string: `status_code: 200` vs `status_code: "200"`
- String vs object: `error: "timeout"` vs `error: {"message": "timeout", "code": 504}`
- Keyword vs text: short strings vs long strings

## Fix 1: Use Index Templates with Explicit Mappings

Create an index template before any data is sent:

```bash
# Create an index template for traces
curl -X PUT "http://elasticsearch:9200/_index_template/otel-traces" \
  -H 'Content-Type: application/json' \
  -d '{
  "index_patterns": ["otel-traces-*"],
  "template": {
    "mappings": {
      "dynamic_templates": [
        {
          "resource_attributes_as_keyword": {
            "path_match": "resource.attributes.*",
            "mapping": {
              "type": "keyword",
              "ignore_above": 1024
            }
          }
        },
        {
          "span_attributes_as_keyword": {
            "path_match": "attributes.*",
            "mapping": {
              "type": "keyword",
              "ignore_above": 1024
            }
          }
        }
      ],
      "properties": {
        "traceId": {"type": "keyword"},
        "spanId": {"type": "keyword"},
        "parentSpanId": {"type": "keyword"},
        "name": {"type": "keyword"},
        "kind": {"type": "keyword"},
        "startTime": {"type": "date_nanos"},
        "endTime": {"type": "date_nanos"},
        "duration": {"type": "long"},
        "status": {
          "properties": {
            "code": {"type": "keyword"},
            "message": {"type": "text"}
          }
        }
      }
    }
  }
}'
```

The `dynamic_templates` section tells Elasticsearch to map all attributes as `keyword` type, preventing integer/string conflicts.

## Fix 2: Normalize Attributes in the Collector

Use the transform processor to ensure consistent attribute types:

```yaml
processors:
  transform/normalize:
    trace_statements:
    - context: span
      statements:
      # Ensure status_code is always a string
      - set(attributes["http.status_code"],
          Concat([attributes["http.status_code"]], ""))
        where attributes["http.status_code"] != nil

    log_statements:
    - context: log
      statements:
      # Ensure level is always a string
      - set(attributes["level"],
          Concat([attributes["level"]], ""))
        where attributes["level"] != nil
```

## Fix 3: Use the Elasticsearch Exporter's Built-in Mapping

The Collector's Elasticsearch exporter supports mapping modes:

```yaml
exporters:
  elasticsearch:
    endpoints: ["http://elasticsearch:9200"]
    traces_index: otel-traces
    logs_index: otel-logs
    mapping:
      mode: ecs  # Use Elastic Common Schema mapping
    flush:
      bytes: 5242880  # 5MB
    retry:
      max_requests: 3
```

The `ecs` mapping mode uses predefined field types from the Elastic Common Schema, which avoids dynamic mapping conflicts.

## Fix 4: Delete and Recreate Conflicting Indices

If the index already has conflicting mappings, you need to delete it and let the template handle the recreation:

```bash
# Step 1: Create the index template first (as shown in Fix 1)

# Step 2: Delete the conflicting index
curl -X DELETE "http://elasticsearch:9200/otel-traces-2024.01.15"

# Step 3: The next batch of data will create a new index
# with the template's mappings applied
```

For data stream indices, use the data stream API:

```bash
# Delete the data stream (and all backing indices)
curl -X DELETE "http://elasticsearch:9200/_data_stream/otel-traces"
```

## Fix 5: Use Coerce for Numeric Fields

If you need numeric fields but get occasional strings, enable coercion:

```bash
curl -X PUT "http://elasticsearch:9200/_index_template/otel-traces" \
  -H 'Content-Type: application/json' \
  -d '{
  "index_patterns": ["otel-traces-*"],
  "template": {
    "settings": {
      "index.mapping.coerce": true
    },
    "mappings": {
      "properties": {
        "attributes": {
          "properties": {
            "http.status_code": {
              "type": "integer",
              "coerce": true
            }
          }
        }
      }
    }
  }
}'
```

With coercion, Elasticsearch will convert `"200"` (string) to `200` (integer) automatically.

## Monitoring Mapping Conflicts

Set up a watch or alert for mapping errors:

```bash
# Check for rejected documents
curl -s "http://elasticsearch:9200/otel-traces-*/_stats/indexing" | \
  jq '.indices | to_entries[] | {index: .key, failed: .value.primaries.indexing.index_failed}'
```

If `index_failed` is non-zero, documents are being rejected due to mapping conflicts.

## Summary

Elasticsearch mapping conflicts happen because OpenTelemetry attributes have dynamic types. The fix is to create index templates with explicit mappings that force all attributes to a safe type (typically `keyword`). Use the Collector's transform processor to normalize attribute types before export. And enable coercion for fields where numeric types are needed but strings occasionally appear.
