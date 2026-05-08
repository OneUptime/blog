# Validation Summary: How to Validate Workloads Outside the Cluster with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BIRD 2
- Linux routing
- Calico network policy

## Sources Consulted
- Calico documentation: Configure BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: BGPPeer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: Configure outgoing NAT: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico documentation: IPPool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- BIRD 2.17.3 User's Guide: https://bird.nic.cz/doc/bird-2.17.3.html
- Kubernetes documentation: kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The BGP example configured only the external BIRD side. Added a Calico `BGPPeer` manifest so Calico nodes are also configured to establish a BGP session with the external host, matching Calico's documented peering model.
- The BIRD example imported routes from Calico but did not export them to the Linux kernel routing table. Added `protocol kernel` with IPv4 `export all` so learned pod routes can be installed into the host routing table, as described in the BIRD kernel protocol documentation.
- The BIRD example lacked a `protocol device` block. Added it so BIRD tracks interface information needed for route reachability.
- The static route persistence example wrote to `/etc/network/routes`, which is not a portable Linux network configuration path. Replaced it with guidance to persist the route through the host's network manager, such as Netplan, NetworkManager, systemd-networkd, or ifupdown.
- The external-to-pod test implied `kubectl` was run from the external host. Clarified that the pod IP can be retrieved from any shell with Kubernetes access, while `ping` and `curl` should be run from the external host.

## Review Notes
- The post uses placeholder CIDRs and ASNs. Readers must substitute values that match their Calico IP pools, node addresses, and BGP ASN configuration.
- For pod-to-external traffic, Calico `natOutgoing` settings can change whether the external workload sees pod IPs or node IPs. External-to-pod validation still requires routability to pod IPs and network policy allowing the traffic.
