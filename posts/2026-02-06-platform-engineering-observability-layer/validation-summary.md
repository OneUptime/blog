# Validation Summary: How to Build a Platform Engineering Observability Layer That Abstracts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry JavaScript/Node.js SDK
- OpenTelemetry Python SDK
- OpenTelemetry OTLP gRPC exporters
- OpenTelemetry semantic conventions
- Kubernetes MutatingWebhookConfiguration
- Platform engineering observability patterns

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript NodeSDKConfiguration API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- OpenTelemetry JavaScript resources API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Kubernetes MutatingWebhookConfiguration v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/

## Issues Found
- The Node.js wrapper used `new Resource(...)`, but current OpenTelemetry JavaScript documentation uses `resourceFromAttributes(...)`. Updated the import and resource creation.
- The Node.js wrapper passed `OTLPMetricExporter` directly to `metricReader`, but the NodeSDK expects a metric reader. Updated it to wrap the exporter in `PeriodicExportingMetricReader` and use the current `metricReaders` array.
- The Node.js wrapper used a non-existent `logRecordExporter` NodeSDK option. Updated it to use `logRecordProcessors` with `BatchLogRecordProcessor` and `OTLPLogExporter`.
- The developer usage snippet used a static Express import after initialization. Static imports are evaluated before module body execution, so this did not ensure OpenTelemetry initialized first. Updated the snippet to use a dynamic import after `initObservability(...)`.
- The developer usage snippet referenced an undeclared `db` object. Added a small TypeScript declaration so the example is syntactically complete.
- The Python wrapper imported `sitecustomize` for auto-instrumentation but did not use it correctly. Removed the misleading import.
- The Python wrapper claimed traces, metrics, and logs as part of the platform capability but only configured traces and metrics. Added a log provider, OTLP log exporter, logging handler, and shutdown hook.
- The resource examples used deprecated `deployment.environment`. Updated them to `deployment.environment.name`.
- The Kubernetes `MutatingWebhookConfiguration` example omitted required v1 fields `admissionReviewVersions` and `sideEffects`. Added both.
- The webhook explanation referred to an `observability: enabled` label while the manifest matched `observability-enabled: "true"` on namespaces. Updated the explanation to match the manifest and the semantics of `namespaceSelector`.

## Review Notes
- OpenTelemetry Python logs are still documented as under development, so production users should watch release notes for minor-version API changes.
- Python automatic instrumentation still requires installing the relevant instrumentation packages and enabling them through the standard Python instrumentation flow or explicit instrumentors.
