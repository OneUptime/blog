# Query Correlated Logs in Loki or Elasticsearch Without Sampled Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, Loki, Elasticsearch, OpenTelemetry, Logging

Description: Find request and workflow logs when traces were not sampled, using stable correlation fields, precise Loki and Elasticsearch queries, and explicit retention assumptions.

---

A missing trace in the backend does not necessarily mean the request had no trace context. Sampling can preserve a valid trace identifier for propagation while deciding not to export the span data. Logs can still contain that trace ID and an application correlation ID.

Search those log fields directly. Keep the distinction between “no stored trace,” “no propagated context,” and “no retained logs,” because each points to a different problem. A trace lookup failure alone cannot tell you which occurred.

## Emit correlation independently of recording

Use a consistent structured record:

```json
{
  "timestamp": "2026-09-11T02:15:00Z",
  "service": {"name": "checkout"},
  "environment": "production",
  "level": "ERROR",
  "message": "inventory request failed",
  "correlation_id": "88f914c3c092449787817a590ec2a7f4",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "trace_sampled": false
}
```

Read trace identifiers from the active valid span context. Do not gate log enrichment on the span's recording flag: a non-recording span context can still be useful. If there is no valid span context, omit the trace fields or represent absence consistently instead of writing an all-zero ID.

Keep the application correlation ID available even when tracing is disabled. Some runtimes or listener configurations may not create an activity at all, so do not assume every log always has a trace ID.

The [OpenTelemetry sampling specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling) distinguishes recording and sampling decisions. Trace sampling and log retention are separate pipelines; retaining one does not guarantee the other exists.

## Query JSON log fields in Loki

Use stable labels such as service and environment to select streams. Keep the unique ID in the log body rather than a stream label:

```logql
{service_name="checkout", environment="production"}
  | json
  | __error__=""
  | correlation_id="88f914c3c092449787817a590ec2a7f4"
```

The selector assumes your collector attaches those two stream labels. Adjust them to your actual ingestion configuration; JSON fields do not automatically become ingestion labels because a query extracts them.

To search several services while keeping the environment bounded:

```logql
{environment="production", service_name=~"checkout|inventory|payments"}
  | json
  | __error__=""
  | trace_id="4bf92f3577b34da6a3ce929d0e0e4736"
```

Set a time range around the reported request before widening it. A workflow correlation ID spanning hours may need a larger range than one HTTP trace. Sort results by time and inspect service, attempt, message, and span fields to reconstruct the sequence.

`| json` parses fields at query time. Malformed lines receive an error label, so `__error__=""` removes parsing failures from this query. If an extracted field collides with an existing stream label, Loki can suffix the extracted name with `_extracted`; inspect the parsed fields when a seemingly correct query returns nothing.

The [LogQL query guide](https://grafana.com/docs/loki/latest/query/log_queries/) documents parsers and field filters. For deployments using [structured metadata](https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/), query the ingested metadata field according to that pipeline instead of assuming the ID is in JSON text.

## Map exact identifiers in Elasticsearch

Use `keyword` fields for exact identifiers. The following mapping can be applied to a dedicated example index through the Elasticsearch API:

```http
PUT logs-correlation-demo
Content-Type: application/json

{
  "mappings": {
    "properties": {
      "timestamp": {"type": "date"},
      "service": {"properties": {"name": {"type": "keyword"}}},
      "environment": {"type": "keyword"},
      "level": {"type": "keyword"},
      "message": {"type": "text"},
      "correlation_id": {"type": "keyword", "ignore_above": 64},
      "trace_id": {"type": "keyword", "ignore_above": 32},
      "span_id": {"type": "keyword", "ignore_above": 16},
      "trace_sampled": {"type": "boolean"}
    }
  }
}
```

The example assumes a maximum 64-character application ID and standard hexadecimal trace/span lengths. Validate at ingestion too: `ignore_above` does not reject an invalid value; it can leave the value in `_source` while omitting it from the indexed field, making exact searches miss it.

For an existing data stream, update the owning index template and plan rollover or reindexing as appropriate. A new mapping cannot retroactively change how old documents were indexed.

## Use term filters and a time range

Query the exact correlation field:

```http
POST logs-correlation-demo/_search
Content-Type: application/json

{
  "size": 100,
  "sort": [{"timestamp": "asc"}],
  "query": {
    "bool": {
      "filter": [
        {"term": {"correlation_id": "88f914c3c092449787817a590ec2a7f4"}},
        {"term": {"environment": "production"}},
        {"range": {"timestamp": {
          "gte": "2026-09-11T02:10:00Z",
          "lt": "2026-09-11T02:20:00Z"
        }}}
      ]
    }
  }
}
```

Replace the first term with `trace_id` when the reported reference is a trace identifier. If your existing mapping uses a `correlation_id.keyword` subfield, query that actual field rather than copying this mapping's path.

A `term` query is suitable for an exact keyword value. A full-text `match` query on an analyzed ID field can tokenize punctuation or normalize values in ways that are unhelpful for identity matching.

## Investigate empty results methodically

Check the environment, time zone, tenant authorization, ingestion delay, and retention window first. Then inspect one raw event to confirm field names, casing, and whether the pipeline renamed or nested the identifiers.

If logs exist for only one service, examine propagation at the next boundary. If IDs are present but no trace exists, check sampling and exporter health. If neither signal exists, do not claim the request never happened; the evidence may have expired or been filtered.

## Conclusion

Retain correlation fields independently of trace recording, query them as exact values, and bound searches by service, environment, and time. Loki log fields and Elasticsearch keyword mappings let you investigate an execution even when the trace backend has no sampled trace to display.

## Official Documentation

- [OpenTelemetry sampling](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- [Loki LogQL log queries](https://grafana.com/docs/loki/latest/query/log_queries/)
- [Loki structured metadata](https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/)
- [Elasticsearch keyword mapping](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword)
- [Elasticsearch term query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query)
