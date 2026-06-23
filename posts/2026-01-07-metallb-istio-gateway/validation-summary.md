# Validation Summary: How to Use MetalLB with Istio Gateway

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes Services of type LoadBalancer
- MetalLB IPAddressPool, L2Advertisement, BGPPeer, and BGPAdvertisement
- Istio ingress gateways, Gateway, VirtualService, DestinationRule, and PeerAuthentication
- Helm
- kubectl and istioctl
- TLS and mutual TLS

## Sources Consulted
- MetalLB documentation: https://metallb.io/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio installation profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio gateway installation documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy documentation: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes source IP preservation documentation: https://kubernetes.io/docs/tutorials/services/source-ip/

## Issues Found
- The post pinned Istio 1.20.0 while presenting the install flow as current. Updated the example to Istio 1.30.1 and changed the Kubernetes prerequisite to the officially supported Kubernetes range for that Istio release.
- The MetalLB examples used the older `metallb.universe.tf/*` annotation prefix and linked to the old MetalLB domain. Updated service annotations and the documentation link to `metallb.io/*` and `https://metallb.io/`.
- The Istio resource examples used `networking.istio.io/v1beta1` and `security.istio.io/v1beta1`. Updated Gateway, VirtualService, DestinationRule, and PeerAuthentication examples to the current `v1` APIs.
- The MetalLB Helm installation omitted Pod Security Admission labels needed for privileged speaker pods on clusters that enforce pod security. Added the documented privileged labels for the `metallb-system` namespace.
- The traffic and mTLS diagrams incorrectly represented VirtualService and DestinationRule as runtime network hops and separated TLS termination from the gateway Envoy. Updated the diagrams to show these resources as Envoy configuration and the gateway as the TLS endpoint.
- The mTLS text implied DestinationRules are always required for mTLS. Updated it to mention Istio auto mTLS and describe DestinationRules as an explicit configuration option.
- The Gateway mutual TLS example used a `caCertificates` file path without showing the required mount. Updated the example to rely on `credentialName` with `cacert` in the Kubernetes secret, matching Istio gateway SDS usage.
- The multi-gateway Deployment disabled injection while claiming to inject the gateway pod and hardcoded a proxy image/arguments. Replaced it with Istio gateway injection using `inject.istio.io/templates: gateway`, `sidecar.istio.io/inject: "true"`, and `image: auto`, and added the ServiceAccount/RBAC needed to read TLS credentials.
- The troubleshooting section used `istioctl x authz check` for mTLS status, but that command checks AuthorizationPolicy. Replaced it with `istioctl x describe pod`, which reports mTLS conflicts.
- The troubleshooting section used `netstat` inside the ingress gateway pod, which is not reliable in modern proxy images. Replaced it with `istioctl proxy-config listeners`.
- The install and complete example sections used overly broad "production-ready" wording. Narrowed this to the default profile and "production-oriented" configuration.

## Review Notes
The tutorial remains a conventional Istio API guide rather than a Kubernetes Gateway API guide. Istio documentation indicates Gateway API is the intended default direction, but the legacy Istio Gateway and VirtualService APIs remain documented and valid.
