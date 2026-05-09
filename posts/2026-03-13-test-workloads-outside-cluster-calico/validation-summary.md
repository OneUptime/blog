# Validation Summary: How to Test Workloads Outside the Cluster with Calico with Live Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BIRD 2
- Linux IP routing
- Mermaid diagrams

## Sources Consulted
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: BGPPeer resource - https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: BGPConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- BIRD 2.16 User's Guide: BGP protocol and Kernel protocol configuration - https://bird.nic.cz/doc/bird-2.16.2.html
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: JSONPath support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Linux ip-route manual - https://man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
- The static route example used `/etc/network/routes` with `ip route` syntax as a generic persistence method. That file path and format are distribution-specific, so the post now tells readers to persist the route using their host's network manager.
- The BIRD example imported routes from Calico but did not configure the BIRD kernel protocol, so learned pod routes would remain in BIRD's routing table and not necessarily be installed in the Linux kernel routing table. Added a kernel protocol stanza that exports BIRD routes to the kernel.
- The BGP example configured only the external host side. Calico also needs a `BGPPeer` resource for the external BGP speaker. Added a minimal `BGPPeer` example scoped to the Calico node that the external host peers with.

## Review Notes
- The example pod CIDR `10.244.0.0/16` is a placeholder; readers must replace it with their actual Calico IP pool or pod CIDR.
- The static route option is suitable for simple tests but points the whole pod CIDR at one Kubernetes node, so production environments should consider redundancy and failure behavior.
- The BGP example intentionally imports Calico routes into the external host and exports none from the external host. That is appropriate when the goal is external-host return routing to pod IPs, but environments that also need to advertise external prefixes into Calico should add explicit export policy.
