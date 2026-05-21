# Validation Summary: How to Configure Tracing Using MeshConfig in Istio

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Istio
- MeshConfig
- Telemetry API
- Envoy distributed tracing
- OpenTelemetry/OTLP
- Zipkin
- Jaeger
- Apache SkyWalking
- Kubernetes ConfigMaps
- Helm
- istioctl

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio configure trace sampling: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio configure tracing with Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio configure tracing using MeshConfig and pod annotations: https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig API reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Helm install guide: https://istio.io/latest/docs/setup/install/helm/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Go package reference for Istio mesh v1alpha1 API fields: https://pkg.go.dev/istio.io/api@v1.29.2/mesh/v1alpha1

## Issues Found
- The Jaeger extension provider example used a Zipkin provider on port 9411. Current Istio Jaeger documentation configures Jaeger through the OpenTelemetry provider on port 4317, so the example was updated to `opentelemetry` with port `4317`.
- MeshConfig tracing examples used `customTags` and `resourceDetectors` in places where current Istio MeshConfig examples and protobuf field names use `custom_tags` and `resource_detectors`. These were changed to the current MeshConfig spelling.
- The provider table implied that the MeshConfig provider type alone determines trace propagation headers. This was clarified because the provider controls the export protocol, while applications still need to propagate the relevant tracing headers.
- The validation example piped raw `data.mesh` content into `istioctl validate -f -`, which is not a complete Istio/Kubernetes resource. It was replaced with a dry-run render of the IstioOperator file using `istioctl install --dry-run -f`.
- The Helm upgrade example passed the Istio mesh values file to the `istio/base` chart. MeshConfig belongs with the `istiod` chart, so the `istio-base` upgrade line was removed from that example.

## Review Notes
- The post is generally accurate for current Istio tracing guidance: define tracing providers in MeshConfig and activate/customize tracing with the Telemetry API.
- Istio 1.30 documentation still includes MeshConfig and pod annotation tracing configuration, but repeatedly encourages users to transition tracing configuration to the Telemetry API where possible.
- `defaultConfig` changes are proxy defaults and may require workload restarts to be reflected in proxy bootstrap-derived settings.
