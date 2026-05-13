# Validation Summary: How to Migrate to Encrypted Pod Traffic in Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- Calico NetworkPolicy
- FelixConfiguration
- WireGuard
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic, https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: NetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes documentation: kubectl debug reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl, https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post claimed Calico encryption protects all pod-to-pod traffic, including same-node traffic. Calico documents WireGuard encryption for supported inter-node pod traffic and explicitly lists encrypted same-node pod traffic as unsupported, so the description, introduction, and conclusion were narrowed to supported inter-node pod traffic.
- The post referred to WireGuard or IPsec for transparent Calico data-plane encryption. The referenced Calico workflow is WireGuard-specific, so the introduction was changed to describe WireGuard only.
- The prerequisite stated that WireGuard requires Linux kernel 5.6+. Calico documents that WireGuard is included in Linux 5.6+ and backported to some earlier distribution kernels, so the wording was corrected.
- The FelixConfiguration patch used `wireguardInterfaceMTU`, which is not the documented field. It was changed to `wireguardMTU`.
- The verification command checked Kubernetes Node YAML for WireGuard status. Calico documents checking Calico node status with `calicoctl get node <NODE-NAME> -o yaml`, so the command was updated.
- The Calico NetworkPolicy egress rule had duplicate `destination` keys, which would cause one mapping to override the other in YAML. The selector and port were combined under a single `destination` key, and TCP protocols were added for the port-specific application rules.
- The packet-capture example used a BusyBox debug image for `tcpdump`. Kubernetes notes that debug images may need tools installed, so the example now uses a network troubleshooting image and the `sysadmin` debug profile.
- The Mermaid diagram used fragile multiline node syntax and a nonstandard edge form. It was updated to valid Mermaid flowchart syntax.

## Review Notes
The post is technically valid after correction. Future improvements could mention IPv6 and host-network encryption caveats in more detail, since Calico's support differs by traffic type and platform.
