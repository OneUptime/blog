# Validation Summary: How to Configure Istio Telemetry Resources with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig extension providers
- Kubernetes ConfigMaps and custom resources
- Flux CD Kustomization resources
- Kustomize manifests
- Prometheus metrics
- OpenTelemetry tracing with Tempo
- Envoy access logging

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task guide: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio OpenTelemetry tracing task guide: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio access logging with Telemetry API task guide: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio 1.22.0 change notes: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/change-notes/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI reconcile kustomization documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The prerequisites said Istio 1.16+ with Telemetry API GA while the manifests use `telemetry.istio.io/v1`. Updated the prerequisite to Istio 1.22+ with Telemetry API v1.
- The mesh tracing example claimed `disableSpanReporting: false` disabled tracing for health check paths. That field only controls whether spans are reported, and `false` keeps reporting enabled. Updated the comment to describe the actual behavior.
- The metrics example used `REQUEST_DURATION_MILLISECONDS`, but the Telemetry API enum is `REQUEST_DURATION`; the Prometheus metric name is `istio_request_duration_milliseconds`. Updated the enum and comment.
- The metrics customization example treated `GRPC_RESPONSE_STATUS` as an Istio metric that could be disabled. It is a metric label, not a metric enum. Updated the example to remove the `grpc_response_status` tag from `ALL_METRICS` using `tagOverrides`.

## Review Notes
- The Flux Kustomization and `flux reconcile kustomization` command are consistent with Flux documentation.
- The access logging filter expression is valid CEL for Istio access logging. In future revisions, the example could mention handling connection failures with `!has(response.code)` if the intended behavior is to log failed connections as well as HTTP error responses.
- The provider names used by Telemetry resources must match providers configured in the mesh configuration; the post correctly demonstrates this with `tempo` and `envoy`.
