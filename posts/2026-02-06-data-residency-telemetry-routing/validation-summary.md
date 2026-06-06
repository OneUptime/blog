# Validation Summary: How to Use Data Residency Compliance by Routing Telemetry to Region-Specific

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector transform processor / OTTL
- OpenTelemetry Collector Kubernetes attributes processor
- OTLP/HTTP exporter
- Kubernetes Deployment labels and environment variables
- Python YAML validation with PyYAML

## Sources Consulted
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector routing processor README and deprecation notice: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/

## Issues Found
- The post said to add Kubernetes annotations but used Kubernetes labels. Changed the wording to "labels" so the text matches the Deployment manifest and the `k8sattributes.extract.labels` configuration.
- The `OTEL_RESOURCE_ATTRIBUTES` value was folded across lines with spaces after commas. Changed it to a single comma-separated string to avoid malformed resource attribute parsing in SDKs.
- The Collector routing example used the deprecated routing processor and also included `pipelines` / `default_pipelines` fields that belong to the routing connector model, not the routing processor. Reworked the example to define `routing` components under `connectors`, route to pipelines, and use the connector as an exporter from intake pipelines and as a receiver in destination pipelines.
- The original config attempted to use `routing/classification` as a pipeline receiver while defining it under `processors`, which is invalid Collector configuration. Replaced it with routing connector pipelines for trace and log PII handling.
- Updated transform processor statements to current documented OTTL path syntax, including `span.attributes` and `log.body`, and added `error_mode: ignore` for safer redaction behavior when optional fields are absent.
- Added `auth_type: serviceAccount` to the `k8sattributes` processor example, matching the documented Kubernetes setup pattern.
- The Python validator inspected the deprecated routing processor's exporter table and did not validate the connector-based routing configuration. Updated it to inspect connector routes, resolve destination pipelines to exporters, and include APAC compliance rules.
- Updated the audit transform snippet to use current OTTL path syntax and `error_mode: ignore`.

## Review Notes
- The corrected Collector configuration was validated with `otel/opentelemetry-collector-contrib:0.153.0`.
- The Python validator snippet was run against the extracted Collector configuration and reported the configuration as compliant.
- The post provides a practical routing pattern, but real compliance programs should still validate retention, access controls, encryption, and backend data processing agreements outside the Collector configuration.
