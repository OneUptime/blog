# Validation Summary: Send All OpenTelemetry Signals to OpenSearch Through One Collector

## Status

validated

## Post Type

Tutorial / configuration guide

## Technologies Covered

- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP) over gRPC and HTTP
- OpenTelemetry Collector OTLP receiver and OTLP/gRPC exporter
- OpenTelemetry Collector memory limiter and batch processors
- OpenSearch Data Prepper 2.12 and later
- Data Prepper unified OTLP source, event routing, and pipeline chaining
- Data Prepper OTel metrics and traces processors
- Data Prepper OpenSearch sink
- OpenSearch Trace Analytics indexes
- OpenSearch CAT Indices and Count APIs
- YAML

## Sources Consulted

- [OpenSearch Data Prepper unified OTLP source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otlp-source/)
- [OpenSearch Data Prepper `getEventType()`](https://docs.opensearch.org/latest/data-prepper/pipelines/get-eventtype/)
- [OpenSearch Data Prepper OpenSearch sink](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/)
- [OpenSearch Data Prepper OTel metrics processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-metrics/)
- [OpenSearch Trace Analytics with Data Prepper](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/)
- [OpenSearch APM telemetry ingestion configuration](https://docs.opensearch.org/latest/observing-your-data/apm/configuring-telemetry-ingestion/)
- [OpenSearch Data Prepper configuration and secrets](https://docs.opensearch.org/latest/data-prepper/managing-data-prepper/configuring-data-prepper/)
- [Data Prepper 2.12.0 release](https://github.com/opensearch-project/data-prepper/releases/tag/2.12.0)
- [Data Prepper 2.16.0 OTel traces processor documentation](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-trace-raw-processor/README.md)
- [Data Prepper environment-variable configuration feature request](https://github.com/opensearch-project/data-prepper/issues/947)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry Collector v0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.159.0)
- [OpenTelemetry Collector OTLP receiver](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/receiver/otlpreceiver/README.md)
- [OpenTelemetry Collector OTLP/gRPC exporter](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/exporter/otlpexporter/README.md)
- [OpenTelemetry Collector OTLP/gRPC exporter metadata](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/exporter/otlpexporter/metadata.yaml)
- [OpenTelemetry Collector v0.144 exporter rename](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/CHANGELOG.md#v1500v01440)
- [OpenTelemetry Collector memory limiter processor](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/processor/memorylimiterprocessor/README.md)
- [OpenTelemetry Collector batch processor](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/processor/batchprocessor/README.md)
- [OpenTelemetry Collector TLS configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/config/configtls/README.md)
- [OpenTelemetry Collector troubleshooting](https://opentelemetry.io/docs/collector/troubleshooting/)
- [OpenSearch CAT Indices API](https://docs.opensearch.org/latest/api-reference/cat/cat-indices/)
- [OpenSearch Count API](https://docs.opensearch.org/latest/api-reference/search-apis/count/)

## Issues Found

- The Collector example used `otlp/data_prepper`. Starting with Collector v0.144, `otlp` is a deprecated alias for the OTLP/gRPC exporter. Changed the component identifier and all pipeline references to the current `otlp_grpc/data_prepper` name.
- The Collector description said that the `memory_limiter` processor added resource limits. The processor monitors Collector memory, refuses data above its soft limit, and forces garbage collection above its hard limit; it does not establish an operating-system or container resource limit. Changed the wording to "memory limiting."
- The Data Prepper version boundary for the unified `otlp` source was vague. Clarified that the source was introduced in Data Prepper 2.12 and that earlier releases require the separate signal sources.
- The Data Prepper example implied that `${OPENSEARCH_USER}` and `${OPENSEARCH_PASSWORD}` were expanded directly from environment variables. Data Prepper 2.16 does not natively expand ordinary `${VAR}` references in `pipelines.yaml`; unmatched values remain literal strings. Clarified that the snippet is a deployment template whose credential placeholders must be rendered before Data Prepper starts.
- The trace pipeline used the deprecated `otel_trace_raw` processor alias. Changed it to the current `otel_traces` processor name.
- The unified OTLP source defaults `traces_output_format` to `otel`, but the trace sink used `trace-analytics-raw`, whose template expects the transformed OpenSearch trace format. Changed the sink to `trace-analytics-plain-raw`, which is the documented index type for the source's default OTel-format spans.

## Review Notes

- The corrected Collector configuration uses components included in the core, contrib, and Kubernetes Collector distributions. The minimal OTLP-only distribution does not include the memory limiter or batch processors.
- The fixed MiB memory-limiter values are valid. For container deployments, current Collector guidance generally recommends coordinating the limiter with the container limit and considering percentage-based settings and `GOMEMLIMIT`.
- Explicit `0.0.0.0` receiver bindings are valid for container networking but expose the ports on every interface; network access should be restricted in production.
- The Data Prepper routing expressions, port, health-check option, pipeline wiring, metrics processor settings, date-based index names, and OpenSearch verification requests are valid.
- Both raw trace index types use the `otel-v1-apm-span` alias and `otel-v1-apm-span-*` backing indexes, so the trace verification wildcards remain valid after the index-type correction.
- The post intentionally abbreviates Trace Analytics and correctly notes that a service-map branch is required for the full feature.
- The development-only plaintext settings and the production TLS/authentication warning are accurate.
- All four links in the post's Official References section resolved to relevant current documentation.
