# Validation Summary: How to Implement Namespace-Based Multi-Tenancy with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio Sidecar resources
- Istio PeerAuthentication and mTLS
- Istio Gateway and VirtualService
- Kubernetes namespaces and labels
- Kubernetes NetworkPolicy
- kubectl

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio configuration scoping documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio NetworkPolicy documentation: https://istio.io/latest/docs/setup/additional-setup/network-policy/
- Istio application requirements and ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The post said the custom `tenant` namespace label would be used later in Istio authorization policies, but the shown AuthorizationPolicy resources use `source.namespaces`, which matches namespace names and requires mTLS identity, not the custom label. Changed the text to say the label is used later in Kubernetes NetworkPolicies.
- The mesh-wide deny-all explanation assumed `istio-system` was the Istio root namespace without saying so. Updated the text to clarify that the policy applies mesh-wide when `istio-system` is the mesh root namespace, which is the default.
- The intra-namespace AuthorizationPolicy examples rely on `source.namespaces`, which Istio derives from peer certificates and therefore requires mTLS. Added a note that strict mTLS must remain enabled for these namespace matches to work reliably.
- The Sidecar section overstated discovery isolation by saying tenants would not know another tenant exists. Sidecar resources scope the Istio/Envoy configuration imported by proxies; they do not hide Kubernetes DNS or API visibility. Reworded the claim to say Envoy will not receive routing configuration for the other tenant's services.
- The NetworkPolicy section described Istio as operating at Layer 7. Istio supports mesh-level traffic policy, including TCP authorization behavior, so the statement was too narrow. Reworded it to avoid the incorrect layer-only claim while preserving the recommendation to use NetworkPolicy as a Layer 3/4 safety net.
- The NetworkPolicy example allowed only same-tenant ingress, which would block traffic from the shared Istio ingress gateway shown earlier in the post. Added an ingress allowance for pods labeled `istio: ingressgateway` in `istio-system`.
- The NetworkPolicy example allowed DNS over UDP only and did not allow sidecars to reach istiod for XDS/CA services. Added TCP DNS egress and narrowed istiod egress on TCP port 15012 for control-plane configuration and certificate flow.

## Review Notes
The Istio API versions used in the examples are current `v1` APIs. The root-namespace behavior for mesh-wide AuthorizationPolicy and PeerAuthentication is correct when the Istio root namespace is `istio-system`, which is the common default but can be customized in an Istio installation. `kubectl` was not installed in the local environment, so CLI verification was performed against official Kubernetes documentation rather than local help output.
