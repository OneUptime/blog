# How to Enrich Late-Arriving Spans with otel_traces_group in Data Prepper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Distributed Tracing, Observability

Description: Recover trace-group metadata for late spans with Data Prepper backend lookup, verified processor names, searchable root spans, and enrichment metrics.

A late child span can arrive after Data Prepper's in-memory trace-group information is no longer available. If the enriched root span is already searchable in OpenSearch, a backend lookup stage can fill the child's missing group metadata before the child reaches the sink.

The naming deserves attention: the trace-analytics guide calls this stage `otel_traces_group`, but the processor reference and Data Prepper 2.16.0 implementation register **`otel_trace_group`**. This article keeps the topic's familiar plural wording while using the verified singular plugin name in YAML. Check the exact release you deploy instead of assuming both names are aliases.

## Separate the two enrichment stages

The first stage, `otel_traces`, processes related spans using root information in memory. The lookup stage, `otel_trace_group`, consults OpenSearch when an incoming span lacks a trace group. It depends on data already stored and searchable there.

That distinction creates an important timing boundary. If the root and child are in the same outgoing batch, the lookup stage runs before that batch's sink writes them. The lookup cannot rely on a root that has not yet reached the backend. It also does not run as a background repair job over every old child document.

The official [trace analytics guide](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/) describes the two-stage design, while the [processor reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-trace-group/) describes backend lookup.

## Add lookup after stateful processing

For an existing Data Prepper 2.16.0 raw-trace pipeline, the relevant configuration is:

```yaml
raw-trace-pipeline:
  source:
    pipeline:
      name: entry-pipeline
  processor:
    - otel_traces:
        trace_flush_interval: 180
    - otel_trace_group:
        hosts: ["https://opensearch.example.com:9200"]
        cert: /etc/data-prepper/certs/opensearch-ca.pem
        authentication:
          username: trace-reader
          password: "REPLACE_WITH_LOOKUP_CREDENTIAL"
  sink:
    - opensearch:
        hosts: ["https://opensearch.example.com:9200"]
        cert: /etc/data-prepper/certs/opensearch-ca.pem
        username: trace-writer
        password: "REPLACE_WITH_SINK_CREDENTIAL"
        index_type: trace-analytics-raw
```

This is a raw-pipeline fragment: it assumes `entry-pipeline` already exists and delivers correctly decoded span records. Replace endpoints and credential placeholders through your deployment's secret-management process before using it. Configure the lookup principal for its read operations and the sink principal for its write/template operations; successful writes do not prove successful lookup reads.

Keep certificate verification enabled and provide the appropriate CA. For Amazon OpenSearch Service, use the authentication and signing configuration documented for the installed processor version rather than combining unrelated examples.

## Confirm the lookup target for your release

Data Prepper 2.16.0 queries the `otel-v1-apm-span` alias. Its released configuration does not expose an `indices` option, even though newer development source may contain one. A custom span index therefore needs special attention; changing the sink destination does not automatically change this lookup target.

Inspect the alias and a known root:

```http
GET _alias/otel-v1-apm-span

GET otel-v1-apm-span/_search
{
  "query": {
    "bool": {
      "filter": [
        {"term": {"traceId": "4bf92f3577b34da6a3ce929d0e0e4736"}},
        {"term": {"parentSpanId": ""}}
      ]
    }
  },
  "_source": ["traceGroup", "traceGroupFields", "parentSpanId"]
}
```

The root needs the group name and associated group fields. Merely finding a span with the same trace ID is insufficient. Also test with the lookup identity, because a read restriction can make a healthy root invisible to the processor.

These release-specific details are visible in the [2.16.0 implementation](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OTelTraceGroupProcessor.java) and [configuration class](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OTelTraceGroupProcessorConfig.java).

## Exercise a controlled late-arrival case

In a test pipeline, send a root and wait until its enriched document is searchable. Then send a child from the same trace after the relevant in-memory state is no longer available. Inspect the newly indexed child's `traceGroup` and `traceGroupFields`.

Include two negative cases: a child whose root never arrives, and a child still missing its trace group when the lookup runs before its root is searchable. Arrival before search visibility alone is not sufficient: `otel_traces` can buffer the child until the root arrives or becomes searchable. These negative cases should not be counted as successful backend enrichment. Do not force a refresh on every production batch just to make this test pass; search visibility and indexing throughput must be balanced.

If repairing previously stored children is required, plan a separate controlled replay or backfill. Evaluate document IDs, duplicate handling, retention, and load first. Enabling the processor alone does not revisit existing index contents.

## Measure success and remaining failures

The [released processor README](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/README.md) lists three useful counters:

| Counter | Meaning |
| --- | --- |
| `recordsInMissingTraceGroup` | Incoming records requiring enrichment |
| `recordsOutFixedTraceGroup` | Records successfully enriched |
| `recordsOutMissingTraceGroup` | Records still missing group information |

Compare counter changes over the same interval and account for restarts. A high repair count shows the fallback is useful; a rising unresolved count calls for checking root arrival, alias coverage, permissions, mapping, and lookup errors.

Watch backend search latency and Data Prepper processing delay as well. The lookup adds a dependency on OpenSearch reads to the ingestion path. It cannot guarantee complete enrichment during backend errors or when roots have already expired under retention.

## Conclusion

Place the verified lookup processor after `otel_traces`, prove that an enriched root is searchable through the processor's target and identity, and observe repaired versus unresolved spans. Use this stage to recover metadata for incoming late spans, with a separate plan for historical repair.
