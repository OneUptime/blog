# Validation Summary: How to Build an OpenSearch Dashboard That Links a Metric Spike to Its Logs and Traces

## Status
validated

## Post Type
Technical guide / observability investigation tutorial

## Technologies Covered
- OpenSearch and OpenSearch Dashboards
- OpenSearch Application Performance Monitoring (APM)
- OpenSearch Data Prepper
- OpenTelemetry Collector and OpenTelemetry Protocol (OTLP)
- Prometheus, PromQL, and remote write
- Piped Processing Language (PPL)
- Distributed tracing and trace-to-log correlation
- Kubernetes and OpenTelemetry resource attributes

## Sources Consulted
- OpenSearch 3.6, APM overview: https://docs.opensearch.org/3.6/observing-your-data/apm/
- OpenSearch 3.6, configuring telemetry ingestion: https://docs.opensearch.org/3.6/observing-your-data/apm/configuring-telemetry-ingestion/
- OpenSearch 3.6, configuring APM in OpenSearch Dashboards: https://docs.opensearch.org/3.6/observing-your-data/apm/configuring-apm/
- OpenSearch 3.6, APM Services: https://docs.opensearch.org/3.6/observing-your-data/apm/services/
- OpenSearch 3.6, trace-to-log correlations: https://docs.opensearch.org/3.6/observing-your-data/exploring-observability-data/correlations/
- OpenSearch 3.6, analyzing traces in Discover: https://docs.opensearch.org/3.6/observing-your-data/exploring-observability-data/discover-traces/
- OpenSearch 3.5, datasets: https://docs.opensearch.org/3.5/observing-your-data/exploring-observability-data/datasets/
- OpenSearch 3.7, dashboard variables: https://docs.opensearch.org/3.7/dashboards/visualize/visualization-editor/dashboard-variables/
- OpenSearch 3.7, using dashboard variables with PPL and PromQL: https://docs.opensearch.org/3.7/dashboards/visualize/visualization-editor/dashboard-variables/using-variables/
- OpenSearch CAT Indices API: https://docs.opensearch.org/latest/api-reference/cat/cat-indices/
- OpenSearch Search API: https://docs.opensearch.org/latest/api-reference/search-apis/search/
- OpenSearch PPL identifiers: https://docs.opensearch.org/latest/sql-and-ppl/identifiers/
- OpenSearch PPL `stats` command and `span` expression: https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/stats/
- Data Prepper 2.14.1 span index template: https://github.com/opensearch-project/data-prepper/blob/2.14.1/data-prepper-plugins/opensearch/src/main/resources/index-template/otel-v1-apm-span-index-standard-template.json
- Data Prepper 2.14.1 log index template: https://github.com/opensearch-project/data-prepper/blob/2.14.1/data-prepper-plugins/opensearch/src/main/resources/index-template/logs-otel-v1-index-standard-template.json
- Data Prepper 2.14.1 APM RED metric generation: https://github.com/opensearch-project/data-prepper/blob/2.14.1/data-prepper-plugins/otel-apm-service-map-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/otel_apm_service_map/utils/ApmServiceMapMetricsUtil.java
- Prometheus, using Prometheus as an OpenTelemetry backend: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus metric and label naming guidance: https://prometheus.io/docs/practices/naming/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Kubernetes resource conventions: https://opentelemetry.io/docs/specs/semconv/resource/k8s/
- OpenTelemetry logs data model and trace-context fields: https://opentelemetry.io/docs/specs/otel/logs/data-model/

## Issues Found
No technical issues found.

## Review Notes
- The REST requests and PPL query are syntactically valid. The expected APM index names, `startTime` sort field, `severityText`, dotted service resource field, one-minute `span` expression, and root-level keyword `traceId` lookup match the documented APIs and Data Prepper schemas.
- OpenSearch APM was introduced in 3.6, datasets and dataset-based correlations in 3.5, and dashboard variables in 3.7. OpenSearch 3.8 is current as of validation, so the versioned 3.5 and 3.6 documentation is marked unmaintained even though the post's historical version boundaries remain correct.
- Prometheus does not promote arbitrary OTLP resource attributes onto every metric by default. Environment and Kubernetes dimensions must be configured under `otlp.promote_resource_attributes` (or joined from `target_info`); the post is accurate because it explicitly conditions label availability on the ingestion path promoting those attributes.
- OpenSearch 3.6 correlation features require the relevant workspace, data source, Explore/Traces, and dataset-management feature flags. The guide assumes an already enabled Observability workspace.
- The related-log control varies by surface: Discover Trace Details provides a Related logs redirect, while Span Details provides a Logs tab. The post's reference to trace or span details covers both documented workflows.
