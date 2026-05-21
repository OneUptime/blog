# Validation Summary: How to Send Istio Logs to OneUptime

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Istio Telemetry API
- Envoy access logs
- OpenTelemetry Collector
- Kubernetes DaemonSet, Service, ServiceAccount, and RBAC
- OneUptime OTLP ingestion

## Sources Consulted
- Istio Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API access logging: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio OpenTelemetry access log provider: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- OpenTelemetry Collector Kubernetes components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector filelog receiver: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- Envoy access log command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- The first Telemetry API filtering example used the `otel` provider before the post had configured an OpenTelemetry access log provider. Changed it to the built-in `envoy` provider, which matches Istio's documented stdout access logging flow.
- The OpenTelemetry Collector example read Kubernetes container log files but attempted to parse the log body as JSON immediately. Added the `container` operator before the router so CRI/Docker container log wrappers are parsed before Envoy JSON is parsed.
- The Collector manifest referenced `serviceAccountName: otel-collector` but did not define the ServiceAccount or RBAC needed for the `k8sattributes` processor. Added the ServiceAccount, ClusterRole, and ClusterRoleBinding.
- The OneUptime exporter used an outdated/non-current endpoint form and the gRPC `otlp` exporter. Updated it to the current OneUptime-documented `otlphttp` exporter, `https://oneuptime.com/otlp`, JSON encoding, and required headers.
- The direct Istio-to-Collector section used the tracing `opentelemetry` extension provider with a `logging` block. Replaced it with Istio's documented `envoyOtelAls` access log provider and `logFormat.labels`.
- The direct Istio-to-Collector section disabled file logging under `meshConfig.defaultConfig.accessLogFile`, which is not the documented field location. Moved it to `meshConfig.accessLogFile`.
- The direct Istio-to-Collector example did not expose an OTLP receiver or Kubernetes Service for Istio to send logs to. Added an OTLP gRPC receiver and a Service on port 4317 to the Collector example.
- The health-check filter referenced an HTTP-only request attribute without guarding non-HTTP traffic. Added a `has(request.url_path)` guard.
- The trace correlation section implied trace IDs and span IDs are included by default. Clarified that the default format includes `x-request-id`, and trace headers must be added to the access log format when the mesh propagates them.

## Review Notes
- The post now uses current Istio `telemetry.istio.io/v1` examples where appropriate. Istio's own task pages still contain some `v1alpha1` examples in specific sections, but the v1 API is valid and documented.
- The Collector image still uses `otel/opentelemetry-collector-contrib:latest`; that works as a tutorial shortcut, but a pinned version is preferable for production deployments.
