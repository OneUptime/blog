# Validation Summary: How to Configure Network Address Translation (NAT) in Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config sysctls)
- Kubernetes (Services, NodePort, LoadBalancer, externalIPs, externalTrafficPolicy)
- kube-proxy (iptables NAT)
- Calico CNI (IPPool `natOutgoing`)
- iptables (PREROUTING, POSTROUTING, MASQUERADE, DNAT, SNAT, REDIRECT)
- nftables (`nft list ruleset`)
- netfilter conntrack (`nf_conntrack_*` sysctls, `conntrack -C/-L`)
- `kubectl debug node` with `nicolaka/netshoot`
- NAT64 (Tayga, `64:ff9b::/96` well-known prefix)

## Sources Consulted
- Calico IPPool reference (Tigera docs): https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes Virtual IPs and Service Proxies (kube-proxy iptables NAT for ClusterIP/NodePort/LB/externalIPs): https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Services (`externalTrafficPolicy: Local`, `externalIPs`): https://kubernetes.io/docs/concepts/services-networking/service/
- `kubectl debug` reference and debug profiles (kubectl 1.27+ `--profile=netadmin`): https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/ and https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debugging/
- Linux kernel `nf_conntrack-sysctl` docs: https://docs.kernel.org/networking/nf_conntrack-sysctl.html
- Talos machine config (`machine.sysctls`): https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- `iptables(8)` / `iptables-extensions(8)` for MASQUERADE, DNAT, SNAT, REDIRECT target syntax
- `capabilities(7)` (CAP_NET_ADMIN requirement for iptables/nftables/conntrack)
- Tayga upstream (apalrd/tayga) and community image references (danehans/docker-tayga)

## Issues Found

1. **`kubectl debug node` examples missing `--profile=netadmin`.** The post repeatedly uses `kubectl debug node/... -- iptables ...`, `nft ...`, and `conntrack ...`. The default debug profile does not grant CAP_NET_ADMIN, so these commands would fail with permission errors. Fixed by adding `--profile=netadmin` (available in kubectl 1.27+) to every such command in the "Checking Current NAT Rules", "Monitoring NAT", and "Troubleshooting NAT" sections.

2. **Non-existent NAT64 container image `nat64/tayga:latest`.** No such image exists on Docker Hub. Replaced with `danehans/tayga:latest` (a commonly referenced community image) and added a comment noting there is no official upstream image and pointing to the upstream Tayga project (apalrd/tayga) for building one.

## Review Notes
- The Calico `natOutgoing: true` field on `projectcalico.org/v3` IPPool is correct.
- The `nf_conntrack_*` sysctls listed are all valid `/proc/sys/net/netfilter/*` entries on modern kernels (including `nf_conntrack_buckets`, which is writable at runtime on 4.x+ kernels in the initial netns where Talos applies `machine.sysctls`).
- The comment "Increase for high-traffic NAT gateways" sits above both `nf_conntrack_max` (increased) and `nf_conntrack_tcp_timeout_established: "86400"` (which is actually a *decrease* from the kernel default of 432000, but is a reasonable choice for NAT gateways to free entries faster). This is a minor stylistic ambiguity, not a technical error, so it was left as-is.
- The DaemonSet uses an `initContainer` to install iptables rules. This works at pod start but rules will not be reinstalled if flushed (e.g., by a kube-proxy restart that re-syncs). For production, a sidecar or periodic re-apply is more robust — out of scope for this post.
- `securityContext: privileged: true` already implies all capabilities, so the additional `capabilities: add: ["NET_ADMIN"]` in the same securityContext is redundant but not incorrect.
- `externalIPs` requires the IP to be routable to a node by external means (e.g., BGP, ARP, manual route); kube-proxy only programs the DNAT rules, it does not advertise the IP. The post's inline comment captures this adequately.
- `externalTrafficPolicy: Local` description (preserves source IP, drops traffic for nodes without a local endpoint) is accurate.
