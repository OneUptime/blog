# Validation Summary: How to Set Up Kubernetes Egress Gateways for Controlled Outbound Traffic

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- Kubernetes Services and Deployments
- Istio egress gateways
- Istio ServiceEntry, Gateway, VirtualService, and DestinationRule
- Squid HTTP proxy
- MetalLB
- Fluent Bit

## Sources Consulted
- Istio egress gateway task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio accessing external services / outbound traffic policy: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- Squid access_log directive reference: https://www.squid-cache.org/Doc/config/access_log/

## Issues Found
- The Istio install example pinned `cd istio-1.20.2` even though the download script installs the current release by default. Changed it to `cd istio-*`.
- The `istioctl install --set components.egressGateways[0]...` arguments were unquoted, which can be interpreted as shell glob patterns. Quoted the indexed `--set` keys.
- The REGISTRY_ONLY command edited the Istio ConfigMap with `sed`, which is brittle and may be a no-op when ALLOW_ANY is implicit. Replaced it with the supported `istioctl install --set meshConfig.outboundTrafficPolicy.mode=REGISTRY_ONLY` flow.
- The HTTPS egress gateway example used `protocol: HTTPS` and `http` VirtualService routes for TLS passthrough traffic. Updated it to current Istio `networking.istio.io/v1`, `protocol: TLS`, `tls` routes, and `sniHosts`, and added the egress gateway DestinationRule subset used by Istio's documented pattern.
- The test pod did not ensure Istio sidecar injection, so traffic might bypass Istio. Added a sidecar injection annotation.
- The egress gateway log command did not specify the `istio-proxy` container. Added `-c istio-proxy`.
- The non-Istio section said it used iptables, but the example implements an explicit HTTP proxy. Corrected the wording.
- The application Deployment snippet was missing the required `apps/v1` selector and matching pod template labels. Added both.
- The NetworkPolicy allowed only UDP DNS. Added TCP port 53 as well.
- The source-IP section implied a Kubernetes LoadBalancer Service IP controls outbound source IP, and used deprecated `loadBalancerIP`. Reworked the Istio example to place gateways on egress nodes and clarified that stable outbound IP requires the node/NAT path to translate traffic to a reserved address.
- The MetalLB annotation used the old `metallb.universe.tf/address-pool` key. Updated it to `metallb.io/address-pool`.
- The namespace-specific Istio example used HTTP routing for TLS traffic and omitted a ServiceEntry. Added a namespace-local ServiceEntry with `exportTo: ["."]` and changed the VirtualService to TLS/SNI routing.
- The Istio metrics example port-forwarded the Service on port 15090, which is not necessarily exposed by the Service. Changed it to port-forward the egress gateway Deployment.
- The Squid log parsing command used `kubectl logs` even though the configuration writes Squid access logs to a file. Changed it to read `/var/log/squid/access.log` from the gateway deployment.
- The Fluent Bit example referenced a `squid` parser that the snippet did not define. Removed the parser reference to keep the shown config self-contained.
- The cost-optimization Deployment snippet was missing the required `apps/v1` selector and matching pod template labels. Added both.
- The DestinationRule outlier detection example used `consecutiveErrors`, which is not the current Istio field. Changed it to `consecutive5xxErrors`.

## Review Notes
The examples still use placeholder hosts such as `api.example.com` and `api.partner.com`; readers must replace them with real external services they control or are allowed to access. TLS inspection is mentioned as a security option, but production TLS inspection requires explicit certificate management, client trust-store updates, and legal/compliance review.
