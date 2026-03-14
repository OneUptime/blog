# How to Understand eBPF in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, EBPF, CNI, Networking, Dataplane, Performance

Description: A deep dive into how Calico uses eBPF as a high-performance dataplane, replacing iptables for packet processing in Kubernetes clusters.

---

## Introduction

eBPF (extended Berkeley Packet Filter) is a Linux kernel technology that allows programs to run safely in kernel space without modifying the kernel source code or loading kernel modules. For Kubernetes networking, eBPF represents a significant architectural shift from the traditional iptables-based dataplane that most CNI plugins use.

Calico was one of the first major CNI plugins to introduce a production-ready eBPF dataplane as an alternative to iptables. The eBPF mode in Calico replaces the legacy iptables rules with programs compiled and loaded directly into the kernel's packet processing pipeline, resulting in lower latency, better throughput, and dramatically reduced CPU overhead at scale.

Understanding Calico's eBPF dataplane requires understanding both why iptables becomes a bottleneck in large Kubernetes clusters and how eBPF programs are structured to avoid those bottlenecks.

## Prerequisites

- Linux kernel 5.3 or later (5.8+ recommended for full feature support)
- Calico v3.13 or later
- Understanding of basic Linux networking (netfilter, conntrack)
- Familiarity with Calico's standard networking model

## Why iptables Becomes a Bottleneck

In the iptables dataplane, every pod, service, and network policy creates netfilter rules. A cluster with 500 services and 5,000 pods can accumulate tens of thousands of iptables rules. Every packet must traverse these rules linearly (in non-nftables modes), creating O(n) performance degradation as the rule count grows.

eBPF solves this by using hash maps and direct packet manipulation instead of linear rule traversal. Lookup time for a connection in an eBPF map is O(1) regardless of the number of entries.

## How Calico's eBPF Programs Work

Calico's eBPF dataplane attaches programs at two key hook points:

```mermaid
graph LR
    NIC[Network Interface] --> TC_INGRESS[TC Ingress Hook\neBPF Program]
    TC_INGRESS --> POD[Pod Network Namespace]
    POD --> TC_EGRESS[TC Egress Hook\neBPF Program]
    TC_EGRESS --> NIC2[Network Interface]
```

1. **TC (Traffic Control) hooks**: Calico attaches eBPF programs at the TC ingress and egress hooks on each network interface. This gives Calico visibility into every packet before and after it enters the pod network namespace.

2. **eBPF maps**: Calico uses kernel eBPF maps (hash tables and LPM tries) to store connection state, policy rules, and routing information. These maps are updated by the control plane (Felix) when configuration changes.

3. **XDP (eXpress Data Path)**: For host endpoints, Calico can optionally attach eBPF programs at the XDP hook, which runs even before the kernel network stack processes the packet - enabling very high performance DDoS mitigation.

## Key Performance Advantages

The eBPF dataplane provides measurable improvements:

- **Service routing without kube-proxy**: Calico's eBPF mode replaces kube-proxy entirely, implementing Kubernetes service load balancing directly in eBPF maps. This eliminates the double NAT that occurs with kube-proxy + iptables.
- **Direct server return (DSR)**: For external traffic to NodePort services, eBPF enables the return path to bypass the node that received the request, reducing latency for asymmetric traffic.
- **Preserved source IP**: Since Calico eBPF can bypass kube-proxy's SNAT, the original client source IP is preserved all the way to the pod, which is critical for application-layer logging and IP-based access control.

## Enabling eBPF in Calico

```bash
# Disable kube-proxy (required before enabling eBPF)
kubectl patch ds -n kube-system kube-proxy \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'

# Enable eBPF dataplane
kubectl patch installation.operator.tigera.io default \
  --type merge -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF"}}}'
```

## Best Practices

- Always test eBPF on your specific kernel version in a lab before enabling in production - some kernel versions have known eBPF bugs
- Monitor kernel memory usage when enabling eBPF - eBPF maps consume kernel memory proportional to cluster size
- Keep kube-proxy disabled after enabling eBPF mode - running both simultaneously causes policy enforcement conflicts
- Use `calicoctl node status` to verify the eBPF dataplane is active on all nodes after enabling

## Conclusion

Calico's eBPF dataplane provides a fundamentally more scalable packet processing model than iptables by leveraging kernel-space programs and hash map lookups. The key benefits - O(1) connection lookups, kube-proxy replacement, DSR, and preserved source IP - make eBPF mode the preferred dataplane for high-performance production clusters running Kubernetes 1.20+ on modern Linux kernels.
