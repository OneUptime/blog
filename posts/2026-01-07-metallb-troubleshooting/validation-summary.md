# Validation Summary: How to Troubleshoot MetalLB Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- MetalLB
- Kubernetes Services and EndpointSlices
- Kubernetes NetworkPolicy
- Layer 2 ARP/NDP announcements
- BGP routing
- kubectl
- tcpdump, arping, iptables, and IPVS diagnostics

## Sources Consulted
- MetalLB official documentation: https://metallb.io/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB advanced L2 configuration: https://metallb.io/configuration/_advanced_l2_configuration/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The Service annotation examples used the old `metallb.universe.tf/*` annotation prefix. Updated them to the current `metallb.io/loadBalancerIPs`, `metallb.io/address-pool`, and `metallb.io/allow-shared-ip` annotations documented by MetalLB.
- The connectivity test used `ping` against the LoadBalancer IP as a network-level check. MetalLB troubleshooting documentation states that pinging the service IP is not a reliable validation method, so the L2 check was changed to `arping` and the note now warns not to rely on ICMP ping.
- The guide used `kubectl get endpoints`, but the Kubernetes Endpoints API is deprecated in v1.33+. Replaced it with an EndpointSlice query using the `kubernetes.io/service-name` label.
- The L2 leader check relied on grepping speaker logs for generic "handling" or leader election strings. Updated it to use Service events and `ServiceL2Status`, which are documented MetalLB status mechanisms for identifying L2 announcement state.
- The Cisco BGP example used a pod IP as the neighbor address. Replaced it with `<node-ip>` because BGP peers are established between the router and Kubernetes nodes running speakers.
- The NetworkPolicy example allowed BGP egress but did not allow speaker-to-speaker memberlist egress or Kubernetes API-server egress, which could break MetalLB when an egress policy selects speaker pods. Added explicit egress rules for memberlist and API-server traffic with a note to adjust the API-server CIDR.
- The Further Reading link used the older `metallb.universe.tf` hostname. Updated it to `https://metallb.io/`.

## Review Notes
The CRD apiVersions and fields in the IPAddressPool, L2Advertisement, BGPPeer, BGPAdvertisement, and BFD-related examples match the current MetalLB documentation. The guide intentionally remains version-general; future updates could mention the `node.kubernetes.io/exclude-from-external-load-balancers` label because MetalLB honors it when deciding whether to announce services from a node.
