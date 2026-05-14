# How to Understand eBPF in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, eBPF, CNI, Networking, Dataplane, Performance

Description: A deep dive into how Calico uses eBPF as a high-performance dataplane, replacing iptables for packet processing in Kubernetes clusters.

---

## Introduction

eBPF (extended Berkeley Packet Filter) is a Linux kernel technology that allows programs to run safely in kernel space without modifying the kernel source code or loading kernel modules. For Kubernetes networking, eBPF represents a significant architectural shift from the traditional iptables-based dataplane that most CNI plugins use.

Calico was one of the first major CNI plugins to introduce a production-ready eBPF dataplane as an alternative to iptables. The eBPF mode in Calico replaces the legacy iptables rules with programs compiled and loaded directly into the kernel's packet processing pipeline, resulting in lower latency, better throughput, and dramatically reduced CPU overhead at scale.

Understanding Calico's eBPF dataplane requires understanding both why iptables becomes a bottleneck in large Kubernetes clusters and how eBPF programs are structured to avoid those bottlenecks.

## Prerequisites

- A Calico-supported Linux distribution with kernel 5.10 or later, or a distribution kernel with the required eBPF features backported (for example, supported Red Hat 8 kernels)
- A Calico version that supports the eBPF dataplane
- Understanding of basic Linux networking (netfilter, conntrack)
- Familiarity with Calico's standard networking model

## Why iptables Becomes a Bottleneck

In the iptables dataplane, pods, services, and network policies are represented through netfilter rules and ipsets. A cluster with 500 services and 5,000 pods can accumulate large rule sets. Packets may need to traverse rule chains linearly (in non-nftables modes), creating performance degradation as the rule count grows.

eBPF solves this by using hash maps and direct packet manipulation instead of linear rule traversal. Lookup time for a connection in an eBPF map is O(1) regardless of the number of entries.

## How Calico's eBPF Programs Work

Calico's eBPF dataplane attaches programs at `tc` hooks on Calico interfaces as well as data and tunnel interfaces, and it also uses socket BPF hooks for connect-time service load balancing:

```mermaid
graph LR
    NIC[Network Interface] --> TC_INGRESS[TC Ingress Hook\neBPF Program]
    TC_INGRESS --> POD[Pod Network Namespace]
    POD --> TC_EGRESS[TC Egress Hook\neBPF Program]
    TC_EGRESS --> NIC2[Network Interface]
```

1. **TC (Traffic Control) hooks**: Calico attaches eBPF programs at the TC ingress and egress hooks on Calico workload interfaces and host data or tunnel interfaces. This gives Calico visibility into workload packets early in the packet path.

2. **eBPF maps**: Calico uses kernel eBPF maps to store connection state, NAT frontend and backend information, and IP sets used by policy selectors. These maps are updated by the control plane (Felix) when configuration changes.

3. **XDP (eXpress Data Path)**: For eligible host endpoint deny-list policies, Calico can enforce drops at XDP when the NIC, driver, and kernel support it, enabling very high performance DoS mitigation.

## Key Performance Advantages

The eBPF dataplane provides measurable improvements:

- **Service routing without kube-proxy**: Calico's eBPF mode replaces kube-proxy entirely, implementing Kubernetes service load balancing directly in eBPF maps. This eliminates the double NAT that occurs with kube-proxy + iptables.
- **Direct server return (DSR)**: For external traffic to NodePort services, eBPF enables the return path to bypass the node that received the request, reducing latency for asymmetric traffic.
- **Preserved source IP**: Since Calico eBPF can bypass kube-proxy's SNAT, the original client source IP is preserved all the way to the pod, which is critical for application-layer logging and IP-based access control.

## Enabling eBPF in Calico

```bash
# Disable kube-proxy for kubeadm-style clusters that run it as a DaemonSet

kubectl patch ds -n kube-system kube-proxy \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'

# Enable eBPF dataplane
kubectl patch installation.operator.tigera.io default \
  --type merge -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF"}}}'

# For supported self-managed kubeadm-style clusters, the operator can also
# configure API server access and manage kube-proxy automatically:
kubectl patch installation.operator.tigera.io default \
  --type merge -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF","bpfNetworkBootstrap":"Enabled","kubeProxyManagement":"Enabled"}}}'
```

## Best Practices

- Always test eBPF on your specific kernel version in a lab before enabling in production - some kernel versions have known eBPF bugs
- Monitor kernel memory usage when enabling eBPF - eBPF maps consume kernel memory proportional to cluster size
- Keep kube-proxy disabled after enabling eBPF mode when possible - if kube-proxy must remain running, set `bpfKubeProxyIptablesCleanupEnabled` to `false` and disable Calico's BPF kube-proxy health check port to avoid iptables flapping and port conflicts
- Verify the eBPF dataplane by checking the `calico-node` logs for `BPF enabled, starting BPF endpoint manager and map manager`, or by inspecting the dataplane with `calico-node -bpf` from a `calico-node` pod

## Conclusion

Calico's eBPF dataplane provides a fundamentally more scalable packet processing model than iptables by leveraging kernel-space programs and map lookups. The key benefits - efficient connection lookups, kube-proxy replacement, DSR, and preserved source IP - make eBPF mode a strong dataplane option for high-performance production clusters running supported Kubernetes and Linux kernel versions.
