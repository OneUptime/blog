# Validation Summary: How to Plan IP Address Ranges for MetalLB in Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- MetalLB
- MetalLB IPAddressPool custom resources
- Layer 2 networking with ARP/NDP
- BGP networking
- IPv4 and IPv6 address planning
- Nmap host discovery
- Linux shell scripting

## Sources Consulted
- MetalLB Configuration: https://metallb.io/configuration/
- MetalLB API Reference: https://metallb.io/apis/index.html
- MetalLB Concepts: https://metallb.io/concepts/
- MetalLB Layer 2 Concepts: https://metallb.io/concepts/layer2/
- MetalLB BGP Concepts: https://metallb.io/concepts/bgp/
- MetalLB Usage and Dual Stack Services: https://metallb.io/usage/index.html
- MetalLB Advanced IPAddressPool Configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl get Reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Nmap Host Discovery Reference: https://nmap.org/man/man-host-discovery.html
- OneUptime website: https://oneuptime.com/

## Issues Found
- The post described L2 announcements as ARP-only. Updated the explanation to ARP/NDP because MetalLB uses ARP for IPv4 and NDP for IPv6 in layer 2 mode.
- The dedicated /24 example said the pool had 254 usable IPs while reserving `.1` and `.255`, but the configured range `10.0.100.2-10.0.100.254` contains 253 addresses. Updated the comments to account for `.0`, `.1`, and `.255` correctly.
- The dedicated subnet routing example suggested routing a separate subnet through a single Kubernetes node and also mentioned L2 mode. Replaced that with accurate guidance: BGP deployments should make the subnet reachable through routing/BGP, while L2 mode should use addresses reachable on the same L2 segment.
- The IPv6 example used separate IPv4 and IPv6 pools for dual-stack services. MetalLB documentation states that dual-stack allocation requires at least one address pool containing both IPv4 and IPv6 ranges, so the example was changed to a single dual-stack pool.
- The production checklist referred only to routed subnet configuration. Updated it to cover either routing or L2 reachability, depending on the MetalLB announcement mode.

## Review Notes
The `kubectl get svc -A --field-selector spec.type=LoadBalancer --no-headers` command is consistent with current Kubernetes documentation for `kubectl get`, service field selectors, and `--no-headers`. The `nmap -sn` command is consistent with official Nmap host discovery documentation. Local validation against installed binaries was not possible because `kubectl` and `nmap` are not installed in this environment.
