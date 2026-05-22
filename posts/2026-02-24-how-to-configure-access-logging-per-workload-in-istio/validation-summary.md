# Validation Summary: How to Configure Access Logging per Workload in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio Telemetry API
- Istio access logging
- Envoy access log providers
- Kubernetes manifests and kubectl
- istioctl diagnostics

## Sources Consulted
- Istio Telemetry API overview: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Configure access logs with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio MeshConfig ExtensionProvider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/

## Issues Found
- The hierarchy section implied the Istio root configuration namespace is always `istio-system`. Istio documentation describes it as typically `istio-system`, but configurable. Updated the wording to "usually istio-system."
- The verification section used `istioctl proxy-config log deploy/my-service -n production` as if it checked effective access logging configuration. The official `istioctl` reference says this command retrieves or changes Envoy component log levels. Replaced it with `istioctl analyze --all-namespaces` for Telemetry validation and `istioctl proxy-config listeners ... -o json` for inspecting generated listener access log configuration.

## Review Notes
The Telemetry API examples use the current `telemetry.istio.io/v1` API, valid `selector.matchLabels`, `accessLogging.providers`, `disabled`, and `filter.expression` fields. The provider examples use documented `envoyFileAccessLog` and `envoyOtelAls` extension provider fields. Workload-specific Telemetry resources should still avoid overlapping selectors in the same namespace, because Istio reports conflicting Telemetry selectors as an error.
