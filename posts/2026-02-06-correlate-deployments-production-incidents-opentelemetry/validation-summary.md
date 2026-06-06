# Validation Summary: How to Use OpenTelemetry to Correlate Deployments with Production Incidents

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry tracing, metrics, resources, and semantic conventions
- OTLP gRPC exporters
- Kubernetes Deployments
- CI/CD deployment webhooks
- Flask
- curl

## Sources Consulted
- OpenTelemetry Python tracing API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters guide: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry service resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry VCS attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/vcs/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Kubernetes Deployment example omitted `spec.selector` and pod template labels. In `apps/v1`, `spec.selector` is required and must match `spec.template.metadata.labels`, so the manifest would be rejected by the Kubernetes API. Added matching `app: api-server` labels and selector.
- The resource and deployment pipeline examples used deprecated `deployment.environment`. Replaced it with the current semantic convention attribute `deployment.environment.name`.
- The resource example used custom deployment-prefixed attributes for Git revision and branch data. Updated the commit and branch fields to the OpenTelemetry VCS semantic convention attributes `vcs.ref.head.revision`, `vcs.ref.head.name`, and `vcs.ref.head.type`.
- The deployment webhook comments said it converted webhook notifications into OpenTelemetry log events, but the code creates trace spans and span events. Updated the wording to describe trace spans accurately.
- The post said deployment spans appear on the same timeline as application traces. Since the code creates separate trace spans in the same backend rather than propagating application trace context, adjusted the wording to say they appear in the same trace backend.

## Review Notes
The Python snippets use current OpenTelemetry Python APIs for resources, tracer providers, batch span processors, OTLP gRPC exporters, meter providers, metric readers, counters, histograms, span attributes, span events, and span status. The curl command syntax is valid. The example still uses some custom `deploy.*` attributes for pipeline-specific metadata; that is acceptable, but production implementations should keep custom attribute namespaces consistent with their organization-wide telemetry conventions.
