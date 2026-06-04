# Validation Summary: How to Implement Mesh Networking Between Edge K3s Clusters Using WireGuard

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Services and EndpointSlices
- K3s networking
- WireGuard and wg-quick
- CoreDNS
- Linux routing, IP forwarding, iptables, and UFW

## Sources Consulted
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- WireGuard wg-quick manual: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s server CLI reference: https://docs.k3s.io/cli/server
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS rewrite plugin documentation: https://coredns.io/plugins/rewrite/

## Issues Found
- The post claimed WireGuard handles dynamic peer discovery and automatic route updates. WireGuard supports roaming endpoints and persistent keepalives, but peer discovery and route updates require separate automation. Updated the wording accordingly.
- The post said to install and configure the same WireGuard interface address on all nodes. Reusing one `wg0` IP across multiple nodes would conflict, so the guide now scopes the example to one gateway node per cluster or single-node clusters.
- The original CIDR plan used Store-B pod CIDR `10.43.0.0/16`, which conflicts with K3s's default service CIDR. Updated the sample pod and service CIDRs to non-overlapping ranges and noted that K3s should be installed with matching `--cluster-cidr`, `--service-cidr`, and `--cluster-dns` values.
- WireGuard peer `AllowedIPs` originally included only remote WireGuard and pod CIDRs. Updated them to include remote service CIDRs too, because later DNS examples forward to remote CoreDNS Service IPs.
- The route section manually added routes that `wg-quick` would already infer from `AllowedIPs`, which could fail with duplicate routes. Replaced that with route verification guidance and a note for `Table = off` configurations.
- The multi-cluster Service example used mismatched `Service` and `Endpoints` names. Replaced it with a selectorless Service and matching `EndpointSlice`, which is the current Kubernetes API pattern.
- The CoreDNS example used a standalone `coredns-custom` ConfigMap that K3s would not necessarily import. Changed it to Corefile server blocks and added `rewrite` rules so `store-b.mesh` / `store-c.mesh` names map to the remote `cluster.local` zones before forwarding.
- The automatic failover example used `ExternalName` together with endpoint objects, which is not how `ExternalName` Services work. Replaced it with a normal selectorless Service backed by an `EndpointSlice` of routed pod IPs and renamed the section to avoid promising health-based failover.
- The NAT traversal example implied that a shell-expanded STUN result could be used directly inside WireGuard config. WireGuard config does not execute shell commands, so the example now uses a stable reachable endpoint plus `PersistentKeepalive`.
- The security section described firewall and rate-limit rules as authentication. WireGuard authentication is key-based, so the section now describes those commands as firewall restrictions and rate limiting.

## Review Notes
The guide is now technically valid as a gateway-based example. For production multi-node clusters, route distribution to every node or a CNI-level multi-cluster networking approach should be planned explicitly.
