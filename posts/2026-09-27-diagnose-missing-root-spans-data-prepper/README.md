# How to Diagnose Missing Root Spans and Trace Groups in Data Prepper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Distributed Tracing, Troubleshooting

Description: Diagnose missing OpenSearch trace groups by proving whether upstream root spans reached Data Prepper and remain searchable in the trace backend.

A trace can contain searchable child spans and still lack its expected trace group. Data Prepper derives trace-group information from the root span. If an upstream service owns that root but never exports it to the same backend, increasing buffers cannot reconstruct its operation name, duration, or status.

Investigate one trace ID and distinguish three cases: the root is delayed, the root was lost, or the root is intentionally outside the telemetry you collect.

## Identify the expected trace root

Record a known request's trace ID, upstream service, operation, and approximate time. Inspect the spans that are actually stored:

```http
GET otel-v1-apm-span*/_search
{
  "size": 100,
  "query": {
    "term": {"traceId": "4bf92f3577b34da6a3ce929d0e0e4736"}
  },
  "_source": [
    "traceId", "spanId", "parentSpanId", "serviceName", "name",
    "startTime", "endTime", "traceGroup", "traceGroupFields"
  ]
}
```

These are the legacy trace-analytics field and index conventions; adapt them to your pipeline. The sample is limited to 100 hits. Use an appropriate retrieval method if a trace is larger before concluding that a parent is absent.

Build the parent chain from `spanId` and `parentSpanId`. A service's inbound server span is not necessarily the trace root: it can have a parent created by a gateway or another service. Similarly, the earliest span you can see is not proof of root status.

The [OpenTelemetry tracing API specification](https://opentelemetry.io/docs/specs/otel/trace/api/) describes parent contexts and root span creation. Broken propagation and missing export are different failures and require different repairs.

## Understand what the trace processor can wait for

Data Prepper's `otel_traces` processor uses root information to enrich related spans. Its documented `trace_flush_interval` controls when descendants without a root are flushed; the default is 180 seconds. The [trace processor reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-traces/) also exposes cache and span-set metrics.

A longer interval can accommodate delayed arrival, but it consumes resources and adds delay. It cannot help when the upstream application never ends or exports its span, a filter drops it, or its exporter sends to a different destination.

Keep a timeline: when the root ended, when its Collector received it, when Data Prepper processed it, and when OpenSearch could search it. This turns “late” into a measurable condition instead of a guess.

## Prove the root at each boundary

Use the same trace and root span IDs throughout the investigation:

1. At the application, confirm the root was created, ended, sampled, and flushed using the SDK's lifecycle.
2. At the Collector, confirm that the root reaches the configured traces pipeline and survives filters, sampling, and transformations.
3. At the exporter, inspect failures, queue pressure, retries, and the exact destination.
4. At Data Prepper, check source receipt, processor output, sink failures, and rejected bulk items.
5. In OpenSearch, search the actual span indexes using a principal with the same read scope as the enrichment processor.

The [Collector troubleshooting guide](https://opentelemetry.io/docs/collector/troubleshooting/) describes using diagnostic output to inspect received and exported telemetry. Temporarily scope detailed output to a controlled test because span attributes may contain sensitive application data.

An upstream Collector and downstream Collector can legitimately use different sampling policies or backends. Document that topology before treating every absent root as data loss.

## Check backend enrichment prerequisites

The lookup processor can enrich an incoming span only from root data available in the backend. For Data Prepper 2.16.0, the released implementation searches the legacy `otel-v1-apm-span` alias for the trace ID and an empty `parentSpanId`:

```http
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
  "_source": ["name", "traceGroup", "traceGroupFields", "parentSpanId"]
}
```

This diagnostic follows the [released group processor implementation](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OTelTraceGroupProcessor.java). It is not a universal query for every trace schema.

If a wildcard finds the root but the alias does not, investigate index selection or retention. If an administrator can find it but the processor cannot, investigate permissions. If the root is present with incomplete enrichment fields, investigate the earlier processing stage rather than only lookup connectivity.

## Choose the repair that matches the cause

For lost roots, fix export, filtering, or backend routing and generate a fresh controlled trace. For delayed roots, measure the arrival gap and evaluate processing windows with memory and latency constraints. For a multi-node Data Prepper deployment, ensure trace-aware peer forwarding routes related spans consistently for stateful processing.

For intentionally unavailable upstream roots, describe the collected trace as partial. Do not clear `parentSpanId` merely to force a downstream span to appear as the root; that changes the recorded causal relationship. If the architecture intentionally starts a new trace, model that decision in instrumentation and preserve a link to upstream context where appropriate.

## Conclusion

Prove the real root's path before tuning trace processing. Root-based enrichment can recover metadata from an available root, but it cannot manufacture information that never entered the telemetry system.
