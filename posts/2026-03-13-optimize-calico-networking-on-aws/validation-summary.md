# Validation Summary: Optimize Calico Networking on AWS

## Status
validated

## Post Type
Tutorial / Guide (performance optimization recipes)

## Technologies Covered
- Calico (IPPool, FelixConfiguration, IPAM, eBPF dataplane, VXLAN/IPIP encapsulation)
- Kubernetes (topology-aware routing, Service annotations, operator-managed Installation CRD)
- AWS EC2 (ENA, c5n/m5n/r5n/c6gn instance families, jumbo frames, cross-AZ data transfer)
- AWS CLI

## Sources Consulted
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico VXLAN/IPIP configuration: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico MTU configuration: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico IPAM block size: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico eBPF dataplane requirements: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Kubernetes topology-aware routing: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- AWS EC2 ENA: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking-ena.html
- AWS VPC jumbo frames: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html

## Issues Found
1. **Invalid IPPool spec — both `ipipMode` and `vxlanMode` set to `CrossSubnet`.** Calico's IPPool validation does not allow both encapsulation modes to be enabled simultaneously; one must be `Never`. Since the rest of the post discusses VXLAN MTU tuning, I changed `ipipMode: CrossSubnet` to `ipipMode: Never` and kept `vxlanMode: CrossSubnet`.
2. **Incoherent blockSize formula.** The original "`blockSize` = log2(max_pods_per_node * 2) rounded up to nearest /N" yields a small integer (e.g. 7 or 8), not a valid IPv4 prefix length. `blockSize` is the prefix length, so addresses-per-block = `2^(32 - blockSize)`. Rewrote as `blockSize = 32 - ceil(log2(max_pods_per_node * 2))`.
3. **Outdated eBPF kernel version.** The post stated 5.3+ (intro) and 5.15+ (Optimization 3). Current Calico docs require kernel 5.10+ (6.6+ recommended for full features). Updated both references.

## Review Notes
- VXLAN overhead of 50 bytes is correct for IPv4 (which matches the IPPool CIDR in the example). For IPv6 / dual-stack workloads the overhead is 70 bytes, but the post is IPv4-only so the 8951 value is right.
- The `kubectl patch installation default` command to enable BPF is correct, but in practice enabling the eBPF dataplane on operator-managed Calico requires also configuring the Kubernetes API server endpoint (`KUBERNETES_SERVICE_HOST`/`PORT` ConfigMap for kube-proxy bypass). The post simplifies for brevity; readers should consult the eBPF enablement guide before applying in production.
- AWS VPC supports MTU up to 9001 within a VPC on ENA-capable instances; saying "AWS VPC default MTU is 9001 (jumbo frames)" is accurate for modern enhanced-networking instance families discussed in Optimization 5, though traffic through internet gateways, NAT gateways, or VPN/transit gateways is still limited to 1500.
- `service.kubernetes.io/topology-mode: "Auto"` is the correct annotation for Kubernetes 1.27+; older clusters use the deprecated `service.kubernetes.io/topology-aware-hints` annotation.
- The c5n/m5n/r5n/c6gn instance family recommendations are accurate; these are the network-optimized variants with up to 100 Gbps networking.
