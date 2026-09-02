# How to Propagate Trace and Span IDs into OpenSearch Log Documents for Cross-Signal Correlation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Logging, Distributed Tracing, Trace, Observability

Description: Carry active OpenTelemetry trace context into structured logs, preserve it through ingestion, and map it for exact trace-to-log correlation in OpenSearch.

---

Trace-to-log correlation depends on identity, not timestamps. The log produced while a span is active must contain the same trace ID and span ID as that span, and the ingestion pipeline must preserve those values without changing their representation.

OpenTelemetry's stable log data model defines top-level `TraceId`, `SpanId`, and `TraceFlags` fields. For non-OTLP JSON logs, the specification recommends top-level `trace_id`, `span_id`, and `trace_flags` names.

## Propagate context before logging

First make sure incoming trace context is extracted and outgoing context is injected using the normal OpenTelemetry instrumentation for your HTTP, RPC, or messaging framework. Creating an unrelated span at the logger produces a new trace ID and breaks end-to-end correlation.

Emit the log while the request span is current. Language support differs: for example, OpenTelemetry .NET automatically populates log correlation fields from the active `Activity`, while other ecosystems may require a supported logging bridge or explicit formatter configuration. Check the current status of the Logs SDK and bridge for your language.

For a legacy structured logger, the resulting record should look like this:

```json
{
  "@timestamp": "2026-09-02T09:41:15.412Z",
  "severity_text": "ERROR",
  "body": "payment authorization failed",
  "service.name": "checkout",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "trace_flags": "01"
}
```

Valid W3C/OpenTelemetry IDs have a precise representation:

- trace ID: 32 lowercase hexadecimal characters representing 16 bytes;
- span ID: 16 lowercase hexadecimal characters representing 8 bytes;
- neither identifier may be all zeroes.

Do not add prefixes, braces, or integer conversions. Leading zeroes are significant.

## Prefer an OTLP logging bridge when available

An OpenTelemetry logging bridge converts records from an existing logging framework into OTLP LogRecords and can attach active context without parsing text. Configure the application's logs exporter to the same Collector that receives traces:

```yaml
receivers:
  otlp:
    protocols:
      grpc: {}
      http: {}

processors:
  batch: {}

exporters:
  otlp/data_prepper:
    endpoint: data-prepper:21893
    tls:
      ca_file: /etc/otel/certs/ca.pem

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/data_prepper]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/data_prepper]
```

If you collect JSON from files or container stdout instead, configure the Collector's file log receiver to parse JSON. Verify that the parsed attributes are promoted or transformed into the schema expected by your Data Prepper pipeline; simply embedding IDs inside an unparsed `body` string does not make them correlation fields.

## Map exact-value fields in OpenSearch

Create mappings before the first documents arrive. IDs are exact identifiers, not prose:

```http
PUT _index_template/otel-application-logs
{
  "index_patterns": ["logs-otel-v1-*"],
  "template": {
    "mappings": {
      "properties": {
        "@timestamp": {"type": "date"},
        "trace_id": {"type": "keyword", "ignore_above": 32},
        "span_id": {"type": "keyword", "ignore_above": 16},
        "trace_flags": {"type": "keyword", "ignore_above": 2},
        "service.name": {"type": "keyword"},
        "body": {"type": "text"}
      }
    }
  }
}
```

If Data Prepper's OpenTelemetry format produces different field paths, map those actual paths instead. The important invariant is that the dataset schema mapping points to the stored ID fields.

## Configure OpenSearch correlation

On OpenSearch 3.5+:

1. Create a traces dataset for the Data Prepper span indexes.
2. Create a logs dataset for the log indexes.
3. In the logs dataset schema mapping, select the trace ID, span ID, service name, and timestamp fields.
4. Configure the trace dataset to correlate with the logs dataset.

Then verify one known request in both indexes:

```http
GET otel-v1-apm-span*/_search
{
  "query": {"term": {"traceId": "4bf92f3577b34da6a3ce929d0e0e4736"}}
}

GET logs-otel-v1-*/_search
{
  "query": {"term": {"trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"}}
}
```

Adapt `traceId` to the actual trace mapping. If the first query works and the second does not, inspect the application/Collector log path. If both work but the UI link does not, repair the dataset field mapping or correlation object.

## Common correlation failures

- **Logs outside a span:** startup, background, or asynchronously detached work has no current span.
- **Context was not extracted:** downstream service starts a new trace instead of continuing the incoming one.
- **IDs are buried in text:** parse structured JSON or use an OTLP bridge.
- **IDs changed type:** a numeric or analyzed-text mapping corrupts exact lookup behavior.
- **Sampling assumptions:** trace context can exist on logs even when a trace is not retained, so some IDs legitimately have no stored span.
- **Redaction:** trace IDs are operational identifiers, but baggage and arbitrary attributes may contain sensitive data; do not copy them indiscriminately into logs.

## Official References

- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [Trace context in non-OTLP log formats](https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/)
- [OpenTelemetry logs concepts](https://opentelemetry.io/docs/concepts/signals/logs/)
- [OpenTelemetry SpanContext requirements](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenSearch correlations](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/correlations/)
