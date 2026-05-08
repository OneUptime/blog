# Validation Summary: How to Validate GAMMA in the Cilium Gateway API

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Gateway API
- GAMMA
- HTTPRoute
- Hubble
- kubectl
- jq

## Sources Consulted
- Cilium GAMMA Support documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gamma/
- Gateway API for Service Mesh documentation: https://gateway-api.sigs.k8s.io/mesh/
- Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- The prerequisites only said Cilium GAMMA and Gateway API must be enabled. Cilium's GAMMA documentation also requires kube-proxy replacement and the L7 proxy, so the prerequisite list now calls out `kubeProxyReplacement=true`, `l7Proxy=true`, and installed Gateway API CRDs.
- The HTTPRoute status command only inspected `status.parents[0]` and only checked `Accepted`. Gateway API reports route status per parent, and backend reference validity is represented by `ResolvedRefs`, so the command now iterates all parent status entries and reports both `Accepted` and `ResolvedRefs`.
- The backend endpoint validation used the legacy Endpoints view. Kubernetes EndpointSlices are the current scalable endpoint API, so the command now lists EndpointSlices by the `kubernetes.io/service-name` label.
- The architecture diagram referred to verifying Cilium eBPF program load for GAMMA. Cilium GAMMA routes L7 traffic through the per-node Envoy proxy, so the diagram now refers to verifying the Cilium Envoy L7 routing path.
- The Hubble example used a generic `--namespace` filter and unqualified service names. Hubble's flow filters are directional, so the command now uses `--from-namespace` and a namespace-qualified `--to-service` value.

## Review Notes
The `kubectl run` examples match the current Kubernetes CLI syntax for one-shot pods, including `--rm`, `--restart=Never`, `--command`, and `-it` usage.
