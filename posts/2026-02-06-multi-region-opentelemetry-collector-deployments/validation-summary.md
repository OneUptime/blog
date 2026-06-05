# Validation Summary: How to Configure Multi-Region OpenTelemetry Collector Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib distribution
- OTLP and OTLP/HTTP exporters
- OpenTelemetry Collector processors, connectors, exporters, and extensions
- Kubernetes ConfigMaps
- Helm deployments
- Prometheus scraping and PromQL

## Sources Consulted
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter helper documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector failover connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/failoverconnector/README.md
- OpenTelemetry Collector metricstransform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector contrib Docker image validation with `otel/opentelemetry-collector-contrib:0.153.0`

## Issues Found
- The Collector image tag was outdated. Updated the Helm values example from `0.96.0` to `0.153.0`, the current contrib image used for validation.
- The gateway config used persistent queue storage without ensuring the storage directory exists. Added `create_directory: true` to the `file_storage` extension.
- The gateway config described Prometheus scraping on port 8888 but did not expose internal metrics on all interfaces. Added the current `service.telemetry.metrics.readers.pull.exporter.prometheus` configuration for `0.0.0.0:8888`.
- The post used `${REGION}` for Collector environment substitution. Updated examples to `${env:REGION}`, which is the current explicit environment-provider syntax.
- The routing connector example was incomplete and used outdated statement-style routing. Updated it to use `condition`, `context`, `default_pipelines`, and proper connector pipeline wiring.
- The application failover ConfigMap used a non-standard `OTEL_EXPORTER_OTLP_FALLBACK_ENDPOINT` environment variable. Replaced it with app-specific primary and secondary endpoint keys and clarified that SDKs do not automatically consume those names.
- The failover example said to use a failover exporter, then configured two exporters in one pipeline. That would fan out to both exporters rather than fail over. Replaced it with the contrib failover connector and valid priority pipeline wiring.
- The metric aggregation example used invalid `metricstransform` fields: `action: combine` without `new_name`, an invalid `aggregation_type: histogram`, and `label_set` at the wrong level. Updated it to a valid `aggregate_labels` operation with `aggregation_type: sum`.
- Added a note that tail sampling across multiple gateway replicas requires all spans for a trace to reach the same collector instance.

## Review Notes
The corrected Collector configuration snippets were validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`. The Helm values snippet is chart-specific and was reviewed for plausibility rather than validated against a concrete chart, because the post uses a placeholder chart path.
