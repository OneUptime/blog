# Validation Summary: How to Configure Cilium GAMMA Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Kubernetes Gateway API
- GAMMA service mesh routing
- HTTPRoute
- Helm
- kubectl

## Sources Consulted
- Cilium GAMMA Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gamma/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes compatibility documentation: https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Kubernetes Gateway API getting started and CRD installation guide: https://gateway-api.sigs.k8s.io/guides/getting-started/
- Kubernetes Gateway API specification for ParentReference and BackendRef: https://gateway-api.sigs.k8s.io/reference/spec/

## Issues Found
- The post described GAMMA as a Gateway API sub-project. Updated this to describe GAMMA as a Gateway API workstream, matching the Gateway API and Cilium documentation.
- The post stated that weighted routing, header manipulation, and retries are handled at the kernel level via eBPF. Updated this to remove the unsupported retries claim and clarify that Cilium GAMMA routes L7 traffic through Cilium's Gateway API controller and per-node Envoy proxy.
- The prerequisites listed Cilium 1.15+, Gateway API CRDs v1.1+, and Kubernetes 1.25+. Updated these to Cilium 1.19+, Gateway API CRDs v1.4+, and a Kubernetes version supported by the selected Cilium release.
- The CRD installation commands used Gateway API v1.1.0 and installed both standard and experimental bundles. Updated the command to use the Cilium stable documentation's Gateway API v1.4.1 standard install with server-side apply.
- The Helm command used the nonexistent `gatewayAPI.enableGamma` value and omitted the required kube-proxy replacement setting. Replaced it with `kubeProxyReplacement=true` and `gatewayAPI.enabled=true`, added the `kube-system` namespace, and added the documented rollout restart commands.
- The verification command searched for `gamma`, but Cilium exposes the relevant configuration through Gateway API and kube-proxy replacement settings. Updated the grep expression accordingly.
- The architecture diagram implied that GAMMA matching is performed entirely by the eBPF datapath. Updated it to include the per-node Envoy proxy used for L7 routing.
- The HTTPRoute explanation omitted Cilium's current producer-route limitation and the ClusterIP Service parent requirement. Added those constraints while keeping the existing example intact.

## Review Notes
The HTTPRoute manifest is syntactically valid for Gateway API v1, including `group: ""` for a Service parentRef and a Service backend reference with `port` and `weight`. The example assumes that `my-service` and `api-backend` Services already exist in the `default` namespace.
