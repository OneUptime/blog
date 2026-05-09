# Validation Summary: How to Troubleshoot GAMMA in the Cilium Gateway API

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes Gateway API
- GAMMA service mesh routing
- HTTPRoute
- ReferenceGrant
- Cilium CLI and cilium-dbg
- Envoy and Cilium datapath policy

## Sources Consulted
- Cilium GAMMA Support documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gamma/
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Gateway API mesh overview: https://gateway-api.sigs.k8s.io/mesh/
- Gateway API v1.5 specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Gateway API v1.5.1 ReferenceGrant CRD: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.5.1/config/crd/standard/gateway.networking.k8s.io_referencegrants.yaml
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get/

## Issues Found
- The post implied that GAMMA troubleshooting proceeds to "eBPF program loading" for HTTPRoute handling. Cilium GAMMA uses Service-bound HTTPRoutes to route traffic through the per-node Envoy proxy, with Cilium datapath involvement. I changed the wording and architecture diagram to refer to Envoy and datapath configuration instead of a route-specific eBPF program being loaded.
- The prerequisites omitted Cilium's documented GAMMA requirements for kube-proxy replacement and the L7 proxy. I added those prerequisites.
- The namespace guidance said cross-namespace Service parentRefs could be fixed with a ReferenceGrant. Current Cilium documentation says Cilium supports only GAMMA producer routes, so HTTPRoutes must be in the same namespace as the parent Service. I corrected the section to state that ReferenceGrant applies to cross-namespace backendRefs, not to enabling Cilium consumer routes with cross-namespace Service parentRefs.
- The ReferenceGrant example used the older `gateway.networking.k8s.io/v1beta1` API version. Gateway API v1.5 includes `ReferenceGrant` as `gateway.networking.k8s.io/v1`, so I updated the snippet.
- The final policy check was labeled as an eBPF policy check while using `cilium-dbg policy get`, which inspects Cilium policy state rather than dumping the BPF policy map. I renamed the step and adjusted the conclusion.

## Review Notes
The commands shown are broadly valid diagnostic commands, but real clusters may require selecting a specific Cilium pod instead of relying on `kubectl exec ds/cilium` behavior, depending on kubectl version and cluster layout.
