# Validation Summary: How to Configure Flux Behind Service Mesh for mTLS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux
- Kubernetes
- Istio
- Linkerd
- Mutual TLS
- Istio AuthorizationPolicy, PeerAuthentication, DestinationRule, and ServiceEntry resources
- Linkerd Server and ServerAuthorization resources
- kubectl, istioctl, linkerd, and flux CLI commands

## Sources Consulted
- Flux source-controller documentation: https://fluxcd.io/flux/components/source/
- Flux notification-controller documentation: https://fluxcd.io/flux/components/notification/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Linkerd proxy injection documentation: https://linkerd.io/2-edge/tasks/adding-your-service/
- Linkerd policy and authorization documentation: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd CLI reference: https://linkerd.io/2-edge/reference/cli/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The Istio egress section implied that STRICT mTLS mode requires ServiceEntry resources for external Git and registry access. STRICT PeerAuthentication controls inbound mTLS, while ServiceEntry is required when Istio outbound traffic policy is restricted, such as `REGISTRY_ONLY`. Updated the section and troubleshooting note to reflect that.
- The Linkerd Server examples used `proxyProtocol: HTTP/2` for Flux HTTP endpoints. Flux source-controller artifact serving and notification-controller webhook/event endpoints use HTTP semantics that should be represented as HTTP/1 in these Server policies. Changed both examples to `proxyProtocol: HTTP/1`.
- The verification section used `istioctl authn tls-check`, which is not a current Istio verification command. Replaced it with current `istioctl proxy-config secret` and `istioctl proxy-config clusters` commands to inspect proxy certificates and the outbound cluster configuration.

## Review Notes
The post remains a technically valid guide after the corrections. The ServiceEntry examples are only needed for meshes configured to block unknown outbound traffic, and deployments with different Flux components or custom service accounts may need to extend the authorization rules.
