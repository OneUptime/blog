# Validation Summary: How to Troubleshoot Cilium GAMMA Support

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Gateway API
- GAMMA / Gateway API for Service Mesh
- HTTPRoute
- Hubble
- eBPF
- Helm

## Sources Consulted
- Cilium GAMMA Support documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gamma/
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gateway-api/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Service Mesh Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting_servicemesh/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting.html
- Cilium Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Kubernetes Gateway API for Service Mesh documentation: https://gateway-api.sigs.k8s.io/mesh/

## Issues Found
- The post referenced a non-existent GAMMA-specific ConfigMap key, `enable-gateway-api-gamma`, and Helm value, `gatewayAPI.enableGamma`. Updated these to the documented Gateway API enablement key and Helm value: `enable-gateway-api` and `gatewayAPI.enabled=true`.
- The prerequisites omitted required Cilium settings for GAMMA. Added `kubeProxyReplacement=true` and `l7Proxy=true`, matching Cilium's GAMMA prerequisites.
- The post said traffic may bypass the eBPF datapath entirely. Cilium still uses its datapath; the more accurate issue is that traffic may not be redirected through the expected Envoy L7 route. Updated the wording.
- The post did not mention Cilium's producer-route limitation. Added that Cilium HTTPRoutes must be in the same namespace as the Service they bind to.
- The architecture diagram showed no route match as default passthrough. Gateway API service mesh behavior rejects requests when routes are attached but none match. Updated the diagram to show request rejection.
- The Hubble troubleshooting note treated route mismatches as dropped flows. Updated it to distinguish policy/datapath drops from route mismatches, which usually appear as rejected HTTP responses or missing backend flows.

## Review Notes
The commands for `kubectl describe httproute`, endpoint/service inspection, `cilium-dbg endpoint list`, `cilium-dbg policy get`, and Hubble flow observation are consistent with current documentation. Cilium's latest documentation references Gateway API v1.5.1, while stable documentation may differ by Cilium release, so the post now avoids pinning an outdated CRD version.
