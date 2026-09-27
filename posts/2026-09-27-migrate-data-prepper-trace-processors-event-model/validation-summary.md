# Validation Summary: How to Migrate Legacy Data Prepper Trace Processor Names to the Event Model

## Status
validated

## Post Type
Technical migration guide with YAML configuration fragments.

## Technologies Covered
- OpenSearch Data Prepper
- OpenTelemetry and OTLP traces
- Data Prepper event-model spans and trace processors
- OpenSearch trace analytics and service maps
- YAML pipeline configuration, TLS, buffering, and peer forwarding

## Sources Consulted
- [Trace analytics and migration to Data Prepper 2.0](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/) — historical event-model transition, removed processors, pipeline branches, and buffer scaling.
- [OTel trace source reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/) — TLS configuration and output formats.
- [OTLP source reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otlp-source/) — unified source and format defaults.
- [Data Prepper 2.0 announcement](https://opensearch.org/blog/announcing-data-prepper-2-0-0/) — core peer forwarding and its configuration file.
- [OTelTraceGroupProcessor registration and implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OTelTraceGroupProcessor.java) — registered singular plugin name and typed span processing.
- [OTelTraceRawProcessor registration and implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-trace-raw-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltrace/OTelTraceRawProcessor.java) — canonical name, deprecated alias, and span input type.
- [ServiceMapStatefulProcessor registration and implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/service-map-stateful/src/main/java/org/opensearch/dataprepper/plugins/processor/ServiceMapStatefulProcessor.java) — canonical name, deprecated alias, and explicit cast to Span.

## Issues Found
No technical issues found.

## Review Notes
- The historical 1.4 opt-in and 2.0 mandatory event transition agree with the official migration guide. The transitional configuration is intentionally historical.
- The guide's plural `otel_traces_group` spelling differs from the inspected Java registration, which declares `otel_trace_group` without a plural alias. The post correctly calls out this discrepancy.
- The pinned registrations confirm `otel_trace_raw` and `service_map_stateful` as deprecated names for `otel_traces` and `service_map`. Release-specific verification remains appropriate.
- The inspected processors require Span objects, supporting the warning that matching JSON field names alone do not establish input compatibility.
- Parsed all three YAML code blocks with PyYAML successfully. Also parsed the commented service-map example separately after removing its comment markers. These are explicitly fragments, not complete runnable pipelines; certificate paths and existing authentication settings must be supplied by the deployment.
- The trace source defaults to `opensearch` output, while the unified `otlp` source defaults to `otel`. Keeping document-format changes separate from the historical event-model migration is accurate.
- The buffer example is illustrative arithmetic rather than a universal sizing prescription. The fixture, heap, error, and sink checks are appropriate deployment validation guidance.
- The post contains no terminal commands. Referenced technical resources were retrieved; pinned Java files were read through their raw GitHub URLs after the browser fetch failed.
- This review checked documentation, source registrations and types, links, and YAML syntax. No Data Prepper/OpenSearch deployment or trace replay was run. README.md required no changes.
