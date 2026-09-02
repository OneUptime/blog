# Add Trace and Span IDs to OpenSearch Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Logging, Distributed Tracing, Trace, Observability

Description: Carry active OpenTelemetry trace context into structured logs, preserve it through ingestion, and map it for exact trace-to-log correlation in OpenSearch.

---

Exact trace-to-log correlation depends on identity, not timestamps. The log produced while a span is active must contain the same trace ID and span ID as that span, and the ingestion pipeline must preserve those values without lossy conversion.

OpenTelemetry's stable log data model defines top-level `TraceId`, `SpanId`, and `TraceFlags` fields. For non-OTLP JSON logs, the specification recommends top-level `trace_id`, `span_id`, and `trace_flags` names.

## Propagate context before logging

First make sure incoming trace context is extracted and outgoing context is injected using the normal OpenTelemetry instrumentation for your HTTP, RPC, or messaging framework. Starting a new root span at the logger instead of using the current request context produces a new trace ID and breaks end-to-end correlation.

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

An OpenTelemetry logging bridge converts records from an existing logging framework into OpenTelemetry LogRecords and can attach active context without parsing text. The SDK and exporter then serialize and send those records over OTLP. Configure the application's logs exporter to the same Collector that receives traces:

```yaml
receivers:
  otlp:
    protocols:
      grpc: {}
      http: {}

processors:
  batch: {}

exporters:
  otlp_grpc/data_prepper:
    endpoint: data-prepper:21893
    tls:
      ca_file: /etc/otel/certs/ca.pem

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp_grpc/data_prepper]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp_grpc/data_prepper]
```

Port `21893` is the unified OTLP source introduced in Data Prepper 2.12. Configure that source for TLS with a server certificate trusted by the Collector's `ca_file`, and route `LOG` and `TRACE` events to the appropriate Data Prepper subpipelines. If the source uses plaintext instead, set `tls.insecure: true` on the Collector exporter.

Current Collector releases bind empty OTLP receiver protocol blocks to `localhost:4317` and `localhost:4318`. Set explicit, appropriately scoped receiver endpoints if the application sends telemetry from another container or host.

If you collect JSON from files or container stdout instead, configure the Collector Contrib `file_log` receiver with a `json_parser`. The parser writes JSON keys to LogRecord attributes by default, so use an embedded `trace` block or a `trace_parser` to populate the LogRecord `TraceId` and `SpanId` fields, or deliberately map the attribute paths in the downstream dataset. Simply embedding IDs inside an unparsed `body` string does not make them correlation fields.

## Map exact-value fields in OpenSearch

For the legacy snake_case JSON shape above, write to a custom index namespace rather than Data Prepper's reserved `logs-otel-v1-*` indexes, and create mappings before the first documents arrive. IDs are exact identifiers, not prose:

```http
PUT _index_template/application-json-logs
{
  "index_patterns": ["application-logs-*"],
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

Do not apply this template to Data Prepper-managed `logs-otel-v1-*` indexes. With a current Data Prepper OpenSearch sink configured with `index_type: log-analytics-plain`, its built-in template maps `traceId` and `spanId` as `keyword`, `flags` as `long`, `@timestamp` as `date_nanos`, `body` as `text`, and string resource attributes such as `resource.attributes.service.name` as `keyword`. In either case, the dataset schema mapping must point to the fields actually stored.

## Configure OpenSearch correlation

Datasets and trace-to-log correlations were introduced in OpenSearch Dashboards 3.5. Enable `workspace.enabled`, `data_source.enabled`, `explore.enabled`, `explore.discoverTraces.enabled`, and `datasetManagement.enabled` in `opensearch_dashboards.yml`. If the OpenSearch Security plugin is installed, also set `opensearch_security.multitenancy.enabled: false`; workspaces are incompatible with Security multi-tenancy. Restart Dashboards and use an Observability workspace. Then:

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

GET application-logs-*/_search
{
  "query": {"term": {"trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"}}
}
```

These queries use Data Prepper's `traceId` span field and the legacy log schema shown above. For Data Prepper-managed OTLP logs, query `logs-otel-v1-*` using `traceId` instead. Adapt both field names to the mappings actually stored. If the first query works and the second does not, inspect the application/Collector log path. If both work but the UI link does not, repair the dataset field mapping or correlation object.

## Common correlation failures

- **Logs outside a span:** logs emitted without an active context-for example, from uninstrumented startup, background, or asynchronously detached work-have no current span.
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
