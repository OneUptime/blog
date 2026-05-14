# Validation Summary: Hubble UI for Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Hubble UI
- Kubernetes
- Helm
- kubectl
- Kubernetes Ingress
- CiliumNetworkPolicy

## Sources Consulted
- Cilium Service Map & Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Kubernetes policy constructs documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The L7 visibility section used `kubectl annotate namespace production "policy.cilium.io/proxy-visibility"=...`, but current Cilium documentation describes L7 protocol visibility through L7 `CiliumNetworkPolicy` rules. I replaced the namespace annotation with a namespaced `CiliumNetworkPolicy` example using HTTP L7 rules on TCP port 80.
- The introduction implied HTTP method and URL path are always available in flow details. I clarified that those fields are available when L7 visibility is enabled.
- The introduction said the guide covered accessing Hubble UI "securely," but the examples only show port-forwarding and a basic Ingress without TLS or authentication. I changed this to "accessing it" to avoid overstating the security properties of the example.
- The conclusion referred to "L7 visibility annotations." I changed this to "L7 visibility policies" to match current Cilium documentation.

## Review Notes
Cilium's official L7 visibility documentation notes that L7 visibility policies also affect policy enforcement: traffic matching the L7 rules becomes visible, but unmatched traffic can be restricted unless allowed by other policies. The Hubble UI Helm settings, `kubectl port-forward` command, and Kubernetes Ingress API version and backend shape were consistent with official documentation.
