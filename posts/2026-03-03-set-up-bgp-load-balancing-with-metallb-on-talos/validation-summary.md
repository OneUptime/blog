# Validation Summary: How to Set Up BGP Load Balancing with MetalLB on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB (v1beta1, v1beta2 CRDs: BGPPeer, IPAddressPool, BGPAdvertisement)
- BGP (Border Gateway Protocol, RFC 4271)
- ECMP (Equal-Cost Multi-Path routing)
- Talos Linux (talosctl)
- Kubernetes (kubectl, LoadBalancer Services)
- Helm
- FRR (Free Range Routing)
- VyOS
- Cisco IOS
- Prometheus / PrometheusRule (Prometheus Operator)
- BFD (Bidirectional Forwarding Detection)

## Sources Consulted
- MetalLB official docs (BGP configuration): https://metallb.universe.tf/configuration/
- MetalLB CRD reference (v1beta1 IPAddressPool/BGPAdvertisement, v1beta2 BGPPeer): https://metallb.universe.tf/apis/
- MetalLB Helm chart: https://metallb.github.io/metallb
- MetalLB metrics docs (metallb_bgp_session_up, metallb_bgp_announced_prefixes_total, metallb_allocator_addresses_in_use_total): https://metallb.universe.tf/configuration/troubleshooting/
- FRR BGP documentation: https://docs.frrouting.org/en/latest/bgp.html (router bgp, neighbor remote-as, address-family ipv4 unicast, maximum-paths, no bgp ebgp-requires-policy)
- VyOS BGP documentation (1.3 Equuleus syntax): https://docs.vyos.io/en/equuleus/configuration/protocols/bgp.html
- Cisco IOS BGP configuration guide (address-family / maximum-paths placement): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/15-mt/irg-15-mt-book.html
- Talos Linux talosctl reference (netstat subcommand): https://www.talos.dev/v1.7/reference/cli/
- RFC 4271 (BGP-4) for hold time / keepalive semantics

## Issues Found
- **Cisco IOS configuration: `maximum-paths 8` placement.** The original snippet placed `maximum-paths 8` at the `router bgp` config-mode level, outside `address-family ipv4 unicast`. In modern Cisco IOS BGP, `maximum-paths` is an address-family command and must live inside the `address-family ipv4 unicast` block in order to apply to IPv4 unicast route selection. The closing `exit-address-family` was also missing. Fixed by moving `maximum-paths 8` inside the address-family block and adding `exit-address-family` for consistency with the FRR example above it.

## Review Notes
- VyOS example uses the 1.2/1.3 (Equuleus) BGP syntax (`set protocols bgp <ASN> neighbor ...`). VyOS 1.4 (Sagitta) changed this to `set protocols bgp system-as <ASN>` plus `set protocols bgp neighbor <addr> remote-as <ASN>`. The current snippet is still valid for users on 1.3, which is widely deployed, so it was left as is.
- MetalLB BGPPeer v1beta2 field names (`myASN`, `peerASN`, `peerAddress`, `peerPort`, `password`, `holdTime`, `keepaliveTime`, `ebgpMultiHop`, `bfdProfile`, `nodeSelectors`) all match the upstream CRD.
- `holdTime: 90s` / `keepaliveTime: 30s` are valid Kubernetes duration strings accepted by the v1beta2 CRD.
- The `bfdProfile: "fast"` reference assumes a separately defined `BFDProfile` resource named `fast`. The post does not show how to create one, but uses it only as an illustrative reference, which is fine in context.
- The Talos firewall paragraph is accurate at a high level: by default Talos does not enforce a host firewall (port 179 is reachable unless the optional `NetworkRule` / KubernetesIngressConfig host firewall is enabled).
- The Prometheus metric names (`metallb_bgp_session_up`, `metallb_bgp_announced_prefixes_total`, `metallb_allocator_addresses_in_use_total`) match what the MetalLB speaker and controller export.
- The FRR example correctly uses `no bgp ebgp-requires-policy`, which is required in recent FRR (8.x+) to allow eBGP route exchange without explicit in/out route-maps.
