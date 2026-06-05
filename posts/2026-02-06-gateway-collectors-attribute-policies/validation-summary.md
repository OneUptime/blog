# Validation Summary: How to Deploy Gateway Collectors That Enforce Attribute Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib processors
- OpenTelemetry Transformation Language (OTTL)
- Kubernetes Deployments, Services, probes, and HorizontalPodAutoscaler
- OTLP receiver and exporter configuration

## Sources Consulted
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector health check extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/healthcheckextension
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry semantic conventions for end user attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/enduser/
- OpenTelemetry semantic conventions for database query attributes: https://opentelemetry.io/docs/specs/semconv/database/sql/
- OpenTelemetry semantic conventions for URL attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/url/
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes HorizontalPodAutoscaler documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

## Issues Found
- The filter processor example used older `spans.include` matching syntax and matched `service.name` as a span attribute even though it is normally a resource attribute. Updated the policy to current OTTL `trace_conditions` that drop spans when required resource attributes are missing or invalid.
- The transform processor examples mixed context-group syntax with unqualified OTTL paths. Updated the redaction and cardinality examples to current OTTL statement syntax using `span.*`, `log.*`, and `resource.*` paths, and added guards so missing attributes do not generate avoidable processing errors.
- The database redaction example only referenced the legacy `db.statement` attribute. Added `db.query.text`, which is the current database semantic convention, while retaining `db.statement` for older instrumentation.
- The `compliance.processed_at` resource attribute was inserted as an empty string. Replaced it with a transform processor that sets the value from `Now()`.
- The Kubernetes liveness and readiness probes referenced port `13133`, but the Collector config did not enable the `health_check` extension or expose the health port in the container. Added the extension, enabled it under `service.extensions`, and added the health container port.
- The OTLP exporter endpoint used an `https://` URL with the gRPC exporter. Changed it to the standard `host:port` endpoint form while leaving TLS configured separately.
- The Collector image was pinned to `0.96.0`, which made the tutorial outdated and tied the snippets to older processor examples. Updated it to `0.153.0`, the current OpenTelemetry Collector release at review time.
- The monitoring section said receiver refusal metrics showed spans rejected by policies. Receiver refusal metrics indicate receiver-level accept/refuse behavior; processor drop metrics are the relevant signal for filter policy drops. Updated the wording.

## Review Notes
- The gateway Collector configuration was validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`.
- The example TLS certificate paths still assume Kubernetes Secrets mount valid certificate and key files at those paths.
