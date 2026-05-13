# Validation Summary: How to Configure Cilium Gateway API Support

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- Kubernetes Gateway API
- Helm
- kubectl
- Envoy
- eBPF
- MetalLB / LoadBalancer services

## Sources Consulted
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Kubernetes Gateway API installation guide: https://gateway-api.sigs.k8s.io/guides/
- Kubernetes Gateway API reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Gateway API v1.4.1 standard install manifest: https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.4.1/standard-install.yaml
- Gateway API v1.4.1 TLSRoute CRD manifest: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.4.1/config/crd/experimental/gateway.networking.k8s.io_tlsroutes.yaml

## Issues Found
- The CRD install command used Gateway API v1.1.0, while current stable Cilium documentation references Gateway API v1.4.1. Updated the command to use the v1.4.1 standard install manifest with server-side apply.
- The post claimed TLS passthrough support without noting that TLSRoute requires the experimental TLSRoute CRD in current stable Cilium. Added an optional TLSRoute CRD install command and clarified the support statement.
- The prerequisites only required Cilium 1.13+ and did not mention kube-proxy replacement. Current Cilium Gateway API documentation requires kube-proxy replacement, so the prerequisite and Helm command were updated.
- The Helm upgrade example enabled only `gatewayAPI.enabled=true`. Current Cilium documentation also sets `kubeProxyReplacement=true` and restarts the Cilium operator and Cilium DaemonSet after the upgrade, so those commands were added.
- The architecture and explanation implied that the operator directly configures eBPF programs for each Gateway. Cilium documentation describes the operator translating valid Gateway API resources into Cilium Envoy configuration, which agents then supply to built-in Envoy or the Envoy DaemonSet. Updated the text and diagram accordingly.
- The conclusion described the implementation as having no traditional proxy overhead. Cilium Gateway API traffic is handled by Envoy integrated with Cilium's datapath, so the conclusion now describes the eBPF datapath plus Envoy-based L7 routing accurately.

## Review Notes
The Gateway and HTTPRoute YAML examples use `gateway.networking.k8s.io/v1` and valid field names for the current Gateway API. The external access example is reasonable for default LoadBalancer mode, but deployments using Cilium Gateway API host network mode or custom Gateway addresses may need different verification steps.
