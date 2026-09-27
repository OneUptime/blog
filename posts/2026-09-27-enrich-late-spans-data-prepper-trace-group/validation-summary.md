# Validation Summary: How to Enrich Late-Arriving Spans with otel_traces_group in Data Prepper

## Status
validated

## Post Type
Technical configuration and troubleshooting guide.

## Technologies Covered
- OpenSearch and Amazon OpenSearch Service
- OpenSearch Data Prepper 2.16.0
- OpenTelemetry spans and distributed tracing
- YAML pipeline configuration and OpenSearch REST search requests

## Sources Consulted
- [Trace analytics guide](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/)
- [Trace group processor reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-trace-group/)
- [Trace processor reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-traces/)
- [OpenSearch sink reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/)
- [Get Index Alias API](https://docs.opensearch.org/latest/api-reference/alias/get-alias/)
- [Search API](https://docs.opensearch.org/latest/api-reference/search-apis/search/)
- [Refresh Index API](https://docs.opensearch.org/latest/api-reference/index-apis/refresh/)
- [Released processor README (2.16.0)](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/README.md)
- [Lookup implementation (2.16.0)](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OTelTraceGroupProcessor.java)
- [Lookup configuration (2.16.0)](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OTelTraceGroupProcessorConfig.java)
- [Connection configuration (2.16.0)](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/ConnectionConfiguration.java)
- [Authentication configuration (2.16.0)](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/AuthConfig.java)
- [OpenSearch client factory (2.16.0)](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OpenSearchClientFactory.java)
- [Stateful trace processor (2.16.0)](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-raw-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltrace/OTelTraceRawProcessor.java)
- [Stateful processor README (2.16.0)](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-raw-processor/README.md)
- [Index alias constants (2.16.0)](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/index/IndexConstants.java)
- [Development lookup configuration](https://github.com/opensearch-project/data-prepper/blob/main/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OTelTraceGroupProcessorConfig.java)

## Issues Found
- **Negative-test timing:** The original text treated a child arriving before root search visibility as a failed backend-enrichment case. The stateful processor can hold that child before the lookup stage executes; the root may become searchable in the meantime, or stateful processing may enrich the child. Changed the condition to a child still missing its trace group when lookup executes before root visibility, and explained the buffering distinction.
- **Deprecated lookup credentials:** The example used top-level lookup `username` and `password`. Although still accepted and shown in the public reference, the 2.16.0 connection configuration identifies these as deprecated when describing authentication validation. Moved lookup credentials under the supported `authentication` object, verified against `AuthConfig` and the client factory. Sink credentials retain their documented syntax.

## Review Notes
- Verified that the registered lookup plugin is `otel_trace_group`; the plural name in the trace analytics guide is inconsistent with the released implementation. The article already handles this correctly.
- Verified `otel_traces`, the integer `trace_flush_interval: 180` setting, pipeline source wiring, sink type, CA configuration, and lookup authentication against official documentation and released source. This is intentionally a fragment requiring an existing upstream pipeline and deployment-specific endpoints, certificates, and credentials.
- Confirmed that the released lookup targets `otel-v1-apm-span`, selects the trace ID and empty parent span ID, and has no configurable `indices` property. Development source does expose that property; it should not be assumed available in 2.16.0.
- The diagnostic search is valid. The implementation retrieves doc values rather than `_source`, so custom mappings must expose trace ID, group name, end time, duration, and status code as the required doc-value fields. Merely seeing fields in `_source` does not establish mapping compatibility.
- The lookup only selects spans with a null or empty group name; it does not repair incomplete group fields when a nonempty group name already exists. The article's missing-group wording is consistent with this behavior.
- Verified the three counter names and their increment paths. Incoming records are processed synchronously; no historical index scan or background repair occurs. Lookup exceptions leave affected incoming spans unresolved.
- Additional implementation caveat: the 2.16.0 search request does not set a result size or paginate, so the default search hit limit can leave roots unreturned for batches spanning many traces. This supports treating the processor as best-effort enrichment rather than a completeness guarantee.
- Reviewed external technical links and retrieved GitHub release files through their raw equivalents when the browsing tool could not render GitHub pages.
- Validation consisted of documentation/source review and local snippet syntax checks. No live Data Prepper/OpenSearch deployment or end-to-end late-arrival test was run.
