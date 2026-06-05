# Validation Summary: How to Fix 'Traces Not Showing Up' in Your OpenTelemetry Backend

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK
- OpenTelemetry Collector
- OTLP over gRPC and HTTP
- Kubernetes networking and kubectl
- curl and netcat connectivity checks

## Sources Consulted
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript SDK API reference for NodeTracerProvider: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.node.NodeTracerProvider.html
- OpenTelemetry JavaScript SDK 2.0 announcement: https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/
- OpenTelemetry Collector debug exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/debugexporter
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl logs documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl exec documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The Node.js example used `provider.addSpanProcessor(...)`, which was removed in OpenTelemetry JavaScript SDK 2.x. Updated the example to pass `spanProcessors` to the `NodeTracerProvider` constructor.
- The gRPC connectivity command used `grpcurl -plaintext localhost:4317 list`, which depends on gRPC server reflection and is not a reliable OTLP Collector receiver check. Replaced it with `nc -vz localhost 4317` and labeled it as TCP reachability for the gRPC receiver.
- The resource examples used the deprecated semantic attribute `deployment.environment`. Updated both the Python resource example and `OTEL_RESOURCE_ATTRIBUTES` example to use `deployment.environment.name`.

## Review Notes
The remaining examples and claims are technically consistent with current OpenTelemetry documentation. The HTTP `curl` example is a reachability check for the OTLP/HTTP receiver, not a substitute for validating full trace ingestion with realistic span data.
