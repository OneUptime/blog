# Validation Summary: How to Configure Istio Default Policies for New Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- IstioOperator / MeshConfig
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- Istio Sidecar
- Istio Telemetry
- Istio DestinationRule
- istioctl
- Python Kubernetes client
- Kopf

## Sources Consulted
- Istio Global Mesh Options: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio IstioOperator Options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference and tasks: https://istio.io/latest/docs/reference/config/security/authorization-policy/ and https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kopf documentation: https://docs.kopf.dev/

## Issues Found
- The post used `networking.istio.io/v1beta1` for `Sidecar` and `DestinationRule`. Updated the examples and Python controller object creation to `networking.istio.io/v1`, matching current Istio reference examples.
- The Telemetry example used `telemetry.istio.io/v1alpha1`. Updated it to `telemetry.istio.io/v1`, matching the current stable Telemetry API.
- The mesh-wide access log fields were nested under `meshConfig.defaultConfig`, but `accessLogFile` and `accessLogEncoding` are MeshConfig fields. Moved them directly under `meshConfig`.
- The mesh-wide retry example described a default HTTP timeout and included `perTryTimeout` under `defaultHttpRetryPolicy`. Istio documents that global `defaultHttpRetryPolicy` does not currently configure `perTryTimeout`, so the field was removed and the label was changed to a retry policy.
- The export scope example used `defaultServiceExportTo` while labeling it as virtual service export scope. Added `defaultVirtualServiceExportTo` and clarified the explanation for service, virtual service, and destination rule export defaults.
- The post recommended Kubernetes initializers. Kubernetes removed the `Initializers` feature gate in Kubernetes 1.14, so the wording was changed to recommend a controller or Kubernetes operator.
- The authorization explanation implied traffic from `istio-system` is generally needed for health checks. Clarified that this is for ingress gateways or other mesh infrastructure running in that namespace.
- The introduction listed timeouts as part of the implemented defaults, but the corrected examples do not configure HTTP request timeouts. Removed that claim.

## Review Notes
- The example still assumes sidecar mode. Ambient mode has different enforcement and targeting considerations, so a future update could call out that scope explicitly.
- The Telemetry provider names (`envoy`, `zipkin`, `prometheus`) must correspond to providers configured in the mesh where applicable.
- `istioctl x authz check` is documented as an experimental command, though it remains present in current Istio command documentation.
