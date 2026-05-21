# Validation Summary: How to Set Up Extension Provider Configuration in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio MeshConfig extension providers
- Istio Telemetry API
- Istio AuthorizationPolicy CUSTOM action
- Envoy external authorization
- Envoy access logging and OpenTelemetry
- Kubernetes ConfigMaps and kubectl

## Sources Consulted
- Istio Global Mesh Options / MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio OpenTelemetry access logs task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio access logs with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/

## Issues Found
- The description and introduction listed rate limiting as an extension-provider use case. Current Istio documentation describes rate limiting through EnvoyFilter, not MeshConfig extension providers, so the rate limiting references were removed.
- The OpenTelemetry tracing example used `resource_detectors` as a list. Current Istio MeshConfig uses `resourceDetectors` with detector names as object keys, such as `environment: {}`, so the snippet was corrected.
- The validation command used `curl` from the `istio-proxy` container against a gRPC authorization port. Istio's examples use workload containers with curl, and curl is not generally available in the proxy container or suitable for validating a gRPC ext_authz endpoint. The command was changed to test the HTTP auth provider from an injected workload container.

## Review Notes
The remaining IstioOperator, MeshConfig extension provider, Telemetry, AuthorizationPolicy, and kubectl examples match the current Istio 1.30 documentation shape. The post does not pin an Istio version, so the review used the current Istio documentation available on 2026-05-21.
