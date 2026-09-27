# Validation Summary: How to Diagnose Missing Root Spans and Trace Groups in Data Prepper

## Status
validated

## Post Type
Technical troubleshooting guide with OpenSearch search requests.

## Technologies Covered
- OpenSearch Search API, Query DSL, and legacy trace analytics indexes.
- Data Prepper `otel_traces` and `otel_trace_group` processors, including version 2.16.0.
- Data Prepper trace-aware peer forwarding.
- OpenTelemetry tracing API, SDK lifecycle, sampling, and Collector pipelines.
- Distributed trace parent relationships and root-span enrichment.

## Sources Consulted
- [OpenSearch OTel trace processor reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-traces/).
- [Data Prepper 2.16.0 trace processor implementation](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-raw-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltrace/OTelTraceRawProcessor.java).
- [Data Prepper 2.16.0 trace processor configuration](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-raw-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltrace/OtelTraceRawProcessorConfig.java).
- [Data Prepper 2.16.0 trace group lookup implementation](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OTelTraceGroupProcessor.java).
- [Data Prepper 2.16.0 lookup configuration](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OTelTraceGroupProcessorConfig.java).
- [Data Prepper 2.16.0 trace group field model](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/model/TraceGroup.java).
- [Data Prepper 2.16.0 index alias constants](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/index/IndexConstants.java).
- [Data Prepper 2.16.0 legacy span index mapping](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/opensearch/src/main/resources/index-template/otel-v1-apm-span-index-template.json).
- [OpenSearch Search API](https://docs.opensearch.org/latest/api-reference/search-apis/search/), [term query](https://docs.opensearch.org/latest/query-dsl/term/term/), and [Boolean query](https://docs.opensearch.org/latest/query-dsl/compound/bool/).
- [Data Prepper Peer Forwarder](https://docs.opensearch.org/latest/data-prepper/managing-data-prepper/peer-forwarder/).
- [OpenTelemetry tracing API specification](https://opentelemetry.io/docs/specs/otel/trace/api/).
- [OpenTelemetry tracing SDK specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/).
- [OpenTelemetry Collector troubleshooting](https://opentelemetry.io/docs/collector/troubleshooting/).

## Issues Found
No technical issues found.

## Review Notes
- Both HTTP examples contain valid JSON and use supported Search API syntax. The legacy mapping defines `traceId` and `parentSpanId` as keyword fields, supporting the exact term queries. The first example explicitly limits retrieval to 100 hits and correctly warns against concluding absence from an incomplete result set.
- Confirmed the registered processor name is `otel_traces`, despite the reference page using the singular `otel_trace` in some prose. Released source confirms the 180-second default, root-information caching, descendant buffering, and the named metrics. The flush interval governs periodic processing and is not a guaranteed exact per-span deadline.
- Confirmed that the 2.16.0 lookup processor targets `otel-v1-apm-span` and selects roots using an empty `parentSpanId`. Its actual implementation batches trace IDs with a terms query and retrieves doc values; the post's single-trace filter and source projection are valid diagnostic equivalents for selecting and inspecting a root, rather than a byte-for-byte reproduction of the processor request.
- Lookup requires the stored trace-group name and end-time, duration, and status fields. Finding a raw root document alone does not establish that enrichment will succeed. The post correctly directs readers to earlier processing when those fields are incomplete.
- Confirmed that `otel_traces` peer forwarding groups spans by `traceId`. Increasing the buffering window cannot recover a root that was never exported to the relevant pipeline or backend.
- OpenTelemetry specifications support the distinction between a server span and a trace root, the end/export lifecycle, and links when instrumentation intentionally starts a new trace. Collector diagnostics support checking each ingestion, processing, and export boundary.
- The index and lookup guidance is explicitly scoped to the legacy schema and Data Prepper 2.16.0. It should not be assumed to describe every newer schema or processor version. Backend enrichment applies to incoming records; it does not automatically repair previously indexed descendants.
- Referenced technical URLs identify the intended official resources. GitHub source was retrieved from the corresponding raw files at the 2.16.0 tag when the browser could not fetch the linked HTML page.
- Validation consisted of documentation/source review and local JSON parsing. No live OpenSearch, Data Prepper, or Collector deployment was available for integration execution. README.md required no changes.
