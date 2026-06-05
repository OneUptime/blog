# Validation Summary: How to Plan Your OpenTelemetry Rollout Strategy for a Large Organization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OpenTelemetry JavaScript
- OpenTelemetry semantic conventions
- Kubernetes DaemonSet
- Envoy OpenTelemetry tracing
- Datadog exporter
- OTLP
- Jaeger

## Sources Consulted
- OpenTelemetry Collector Docker installation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector Kubernetes Helm chart: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector processors: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry JavaScript resources API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript instrumentation guidance: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry logs specification and log correlation: https://opentelemetry.io/docs/reference/specification/logs/
- Envoy OpenTelemetry tracer API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Datadog OpenTelemetry Collector setup: https://docs.datadoghq.com/opentelemetry/setup/collector_exporter/install/

## Issues Found
- The Collector DaemonSet used an outdated Docker Hub image and mounted configuration at `/etc/otel` without telling the Collector to read that path. Updated the image to the current official GHCR contrib image and added an explicit `--config=/etc/otelcol-contrib/config.yaml` argument with a matching `subPath` mount.
- The Collector resource processor and JavaScript resource example used deprecated `deployment.environment`. Updated both to `deployment.environment.name`.
- The JavaScript resource example used the older `Resource` constructor and `SemanticResourceAttributes` constants. Updated it to `resourceFromAttributes` and current `ATTR_*` semantic convention constants.
- The text described required attributes as span attributes even though the example and use case are resource attributes. Updated the wording to "required resource attributes."
- The workshop example loaded Express before initializing OpenTelemetry, which can break Node.js auto-instrumentation. Moved OpenTelemetry initialization before requiring Express.
- The instrumentation coverage example used top-level `await`, which is only valid in module contexts. Wrapped it in an async function so the snippet is valid JavaScript in a broader Node.js context.
- The legacy systems section said Collectors can parse logs and convert them to traces. Updated it to say Collectors can parse logs into structured log telemetry and correlate them with traces when trace context is present.

## Review Notes
The Envoy snippet is a partial configuration fragment and still requires a complete listener, route, and cluster configuration in a real deployment. The OpenTelemetry Collector examples are illustrative and assume that referenced ConfigMaps, secrets, backend endpoints, and Jaeger OTLP endpoints exist.
