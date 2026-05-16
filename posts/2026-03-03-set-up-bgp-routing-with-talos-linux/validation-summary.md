# Validation Summary: How to Set Up BGP Routing with Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (machine config: sysctls, network interfaces)
- BGP (Border Gateway Protocol, RFC 4271)
- MetalLB (BGPPeer v1beta2, IPAddressPool/L2Advertisement/BGPAdvertisement v1beta1)
- Cilium CNI (CiliumBGPPeeringPolicy, CiliumLoadBalancerIPPool — cilium.io/v2alpha1)
- Kubernetes (LoadBalancer Services, Helm)
- Cisco IOS BGP CLI
- FRRouting (FRR) BGP CLI
- kubectl (debug node, logs, get/exec)

## Sources Consulted
- MetalLB official documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.io/apis/ (BGPPeer v1beta2 — confirms myASN, peerASN, peerAddress, holdTime, keepaliveTime as Duration)
- Cilium BGP control plane docs: https://docs.cilium.io/en/v1.14/network/bgp-control-plane/
- Cilium LB IPAM docs: https://docs.cilium.io/en/latest/network/lb-ipam/ (confirms `blocks` field for CiliumLoadBalancerIPPool)
- Talos configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/ (confirms machine.sysctls map and machine.network.interfaces schema)
- IANA private ASN allocation (RFC 6996): 64512–65534 for 16-bit private ASNs

## Issues Found
No technical issues found.

All code, configuration snippets, and technical claims were verified against official documentation:
- MetalLB BGPPeer fields (myASN, peerASN, peerAddress, keepaliveTime, holdTime) match the v1beta2 spec; Duration strings like "20s"/"60s" are accepted.
- MetalLB BGPAdvertisement fields (ipAddressPools, communities, localPref) match the v1beta1 spec.
- Cilium CiliumBGPPeeringPolicy structure (virtualRouters, localASN, exportPodCIDR, neighbors with peerAddress/peerASN/gracefulRestart{enabled,restartTimeSeconds}, serviceSelector) matches the v2alpha1 schema.
- Cilium CiliumLoadBalancerIPPool uses `blocks: - cidr: ...` which is the documented field name.
- Talos machine.sysctls is a string map; the sysctls referenced (net.ipv4.ip_forward, net.ipv6.conf.all.forwarding, net.netfilter.nf_conntrack_max) are real, valid kernel parameters.
- Talos machine.network.interfaces with `interface`, `addresses` (CIDR), and `routes` (network/gateway) matches the v1alpha1 schema.
- BGP uses TCP port 179 (IANA-assigned) — correct.
- Private ASN range 64512–65534 (RFC 6996) — correct.
- Cisco IOS and FRRouting BGP CLI examples follow valid syntax for the operations shown.

## Review Notes
- The post tags include "Calico" but the body does not discuss Calico. This is a metadata mismatch (not a technical error) and was left as-is per the "only fix technical errors" guidance.
- The IPAddressPool example includes both an `L2Advertisement` and a `BGPAdvertisement` for the same pool. This is syntactically valid MetalLB configuration, but in practice, mixing L2 and BGP advertisements for the same pool is unusual for a BGP-focused setup and may cause unexpected behavior depending on how clients reach the service. Not corrected because it is not technically wrong.
- MetalLB v0.14.5 (referenced in the manifest URL) is a valid released version; newer 0.14.x releases exist and would also work — version was left as the author specified.
- The CiliumBGPPeeringPolicy (cilium.io/v2alpha1) shown is the original BGP control plane API and remains supported. Cilium 1.16+ introduced a newer BGPv2 API (CiliumBGPClusterConfig, CiliumBGPPeerConfig, CiliumBGPAdvertisement, CiliumBGPNodeConfig), which readers on newer Cilium may want to evaluate. Not flagged as an error because the v2alpha1 API is still functional.
- `kubectl debug node/<node>` creates a privileged debug pod on the node; it works on Talos because the pod runs in the Kubernetes layer rather than touching the immutable host filesystem.
