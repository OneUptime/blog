# Validation Summary: How to Configure MetalLB BGP Mode for IPv4 Address Announcement

## Status
validated

## Post Type
Guide

## Technologies Covered
- MetalLB
- Kubernetes
- BGP
- FRRouting (FRR)
- IPv4 networking
- ECMP

## Sources Consulted
- MetalLB configuration docs: https://metallb.io/configuration/
- MetalLB advanced BGP configuration docs: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB BGP mode concepts: https://metallb.io/concepts/bgp/
- MetalLB troubleshooting docs: https://metallb.io/troubleshooting/
- MetalLB FAQ: https://metallb.io/faq/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB release notes: https://metallb.io/release-notes/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes labels and selectors docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting basic commands documentation: https://docs.frrouting.org/en/stable-8.0/basic.html

## Issues Found
- The post stated ECMP behavior without the required router-side multipath prerequisite. I changed the explanation to make clear that MetalLB BGP load balancing depends on routers being configured to support multipath/ECMP, which matches the MetalLB BGP concepts documentation.
- The BFD example implied generic BGP support, but MetalLB documents BFD as an FRR-mode feature. I updated the `bfdProfile` comment to state that it is FRR mode only.
- The speaker log selector used `component=speaker`, which is not the current MetalLB labeling convention. I updated the example to `app.kubernetes.io/component=speaker` based on current MetalLB labels and release notes.
- The router verification example used `show ip bgp`, which FRR documents as the older command style. I updated the examples to `show bgp ipv4 unicast`, which is the current FRR format.
- The original ECMP test implied that seeing different pod hostnames by `curl` alone proves router-level ECMP. That is not sufficient. I corrected the test to use `ServiceBGPStatus` and router route inspection to confirm multi-node advertisement and multiple next hops, while keeping the reachability check through the announced LoadBalancer IP.
- The session verification guidance relied on a specific expected log line. I replaced that with a more reliable FRR-mode verification command using `vtysh` against the BGP neighbor and an `Established` state check.

## Review Notes
- MetalLB documents an important BGP-mode limitation: when the set of advertising nodes changes, active connections can be reset because router hashing is stateless. The post is still technically correct after the fixes, but that operational caveat could be worth covering in a future revision.
