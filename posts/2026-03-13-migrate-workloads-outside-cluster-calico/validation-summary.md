# Validation Summary: How to Migrate to Workloads Outside the Cluster with Calico Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BIRD 2
- Linux static routing
- Calico NetworkPolicy

## Sources Consulted
- Calico documentation: Configure BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: BGPPeer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: Determine best networking option: https://docs.tigera.io/calico/latest/networking/determine-best-networking
- Calico documentation: Configure outgoing NAT: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- BIRD 2.18 User's Guide: https://bird.nic.cz/doc/bird-2.18.html
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Linux ip-route manual reference: https://man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
- The BGP example configured only the BIRD side of the session. Added a Calico `BGPPeer` manifest so the selected Calico node is configured to peer with the external host, matching Calico's documented `BGPPeer` model.
- The BIRD example imported routes from Calico into BIRD but did not export them to the Linux kernel routing table. Added `protocol device` and `protocol kernel` with IPv4 `export all` so normal host traffic can use the learned pod routes.
- The static route persistence example used `/etc/network/routes`, which is not a portable Linux persistence path. Replaced it with a note to persist the route through the host's network manager or distribution-specific route configuration.
- The external-to-pod test implied `kubectl` was run from the external host. Clarified that the pod IP lookup is run from a machine with Kubernetes API access, then the `ping` and `curl` tests run from the external host.

## Review Notes
The examples are intentionally generic and still require operators to substitute their actual pod CIDR, node names, node IPs, ASNs, and host network persistence mechanism. In production, BGP import/export filters and redundant peers should be considered instead of accepting all routes from a single peer.
