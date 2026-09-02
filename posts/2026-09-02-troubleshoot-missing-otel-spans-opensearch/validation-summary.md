# Validation Summary: Troubleshoot Missing OpenTelemetry Spans in OpenSearch

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- OpenTelemetry SDK tracing, span processing, and sampling
- OpenTelemetry Collector OTLP receivers, processors, exporters, internal telemetry, and zPages
- OTLP/gRPC and OTLP/HTTP
- OpenSearch Data Prepper OTLP ingestion, trace processing, service maps, OpenSearch sink retries, and dead-letter queues
- OpenSearch indexes, Query DSL, Bulk API, disk watermarks, Trace Analytics, and OpenSearch Dashboards
- Kubernetes DNS, NetworkPolicy, and Collector routing considerations

## Sources Consulted

- [OpenTelemetry tracing SDK specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/)
- [OpenTelemetry Protocol specification](https://opentelemetry.io/docs/specs/otlp/)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry Collector troubleshooting](https://opentelemetry.io/docs/collector/troubleshooting/)
- [OpenTelemetry Collector internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/)
- [OpenTelemetry Collector changelog](https://github.com/open-telemetry/opentelemetry-collector/blob/main/CHANGELOG.md)
- [OpenTelemetry Collector debug exporter](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md)
- [OpenTelemetry Collector exporter helper queue and retry configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md)
- [OpenTelemetry Collector memory limiter processor](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md)
- [OpenTelemetry Collector tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)
- [OpenTelemetry Collector scaling guidance](https://opentelemetry.io/docs/collector/scaling/)
- [OpenSearch Data Prepper unified OTLP source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otlp-source/)
- [OpenSearch Data Prepper OTel trace source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/)
- [OpenSearch Data Prepper OTel trace processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-traces/)
- [OpenSearch Trace Analytics with Data Prepper](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/)
- [OpenSearch APM telemetry ingestion](https://docs.opensearch.org/latest/observing-your-data/apm/configuring-telemetry-ingestion/)
- [OpenSearch Data Prepper OpenSearch sink](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/)
- [OpenSearch CAT Indices API](https://docs.opensearch.org/latest/api-reference/cat/cat-indices/)
- [OpenSearch Bulk API](https://docs.opensearch.org/latest/api-reference/document-apis/bulk/)
- [OpenSearch cluster disk and flood-stage settings](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/cluster-settings/)
- [OpenSearch Discover Traces](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/discover-traces/)

## Issues Found

- The Collector example used `otlp/data_prepper`. The `otlp` exporter type became a deprecated alias in Collector v0.144.0, so both the exporter definition and pipeline reference were changed to the current `otlp_grpc/data_prepper` identifier.
- The detailed debug exporter used the Collector's internal logger by default. Because internal-log sampling is enabled by default, a known trace could be omitted from busy debug output. Added `use_internal_logger: false` and `output_paths: [stderr]` so the deterministic boundary test is not affected by internal-log sampling.
- The statement that every Collector component is activated through a pipeline incorrectly included extensions. Narrowed it to receivers, processors, and exporters, and clarified that `zpages` must be configured under `extensions` and enabled through `service.extensions`.
- Queue overflow and retry exhaustion were described as one condition, and the internal-metric description used generic processor refused/dropped terminology that is not the current common metric model. Separated queue enqueue failures from retry-window exhaustion and changed the metric categories to receiver accepted/refused, processor incoming/outgoing, exporter sent/send-failed/enqueue-failed, queue size/capacity, and in-flight requests, with logs used for retry activity.
- The tail-sampling guidance did not state that every span in a trace must reach the same tail-sampling Collector instance, and it treated load balancing as though it were a processor. Updated the text to require trace-ID-aware routing, cover all routing stages, and identify load balancing that splits a trace across instances.
- A wrong OpenSearch cluster was listed as an individual bulk-item error, even though Data Prepper's `hosts` setting selects the cluster and a successfully resolved wrong index or cluster may produce no item error. Moved cluster/index verification before bulk-error inspection, added the Bulk API's top-level `errors` flag, and removed the incorrect bullet.

## Review Notes

- Port `21893` is correct for Data Prepper's current unified `otlp` source. The separate `otel_trace_source` defaults to `21890`, so deployments using that source must change the Collector endpoint accordingly.
- The current OpenSearch APM pipeline uses `otel_traces` with `trace-analytics-plain-raw` and `otel_apm_service_map` with `otel-v2-apm-service-map`; older Trace Analytics pipelines commonly use the v1 service-map index. The post appropriately checks both v1 and v2 service-map patterns.
- Discover Traces was introduced in OpenSearch 3.5 and requires an Observability workspace. Its automatic trace-dataset discovery pattern is `otel-v1-apm-span*`; custom index names require manual dataset creation.
- Collector internal metric names and availability vary by release, and the debug exporter's rendered output format is unstable. The post appropriately recommends consulting documentation for the installed Collector version and enabling detailed debug output only briefly.
- All five links in the post's Official References section resolved to the intended current documentation pages during validation.
