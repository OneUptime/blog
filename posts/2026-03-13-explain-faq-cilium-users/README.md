# Explaining the Cilium FAQ: Common Questions and Why They Come Up

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, FAQ, Troubleshooting, Kubernetes

Description: An explanation of the most common Cilium FAQ topics, why these questions arise, and what the answers reveal about Cilium's architecture.

---

## Introduction

The Cilium FAQ is not just a list of answers - each question in it represents a pattern of confusion that arises from genuine architectural differences between Cilium and what users expect from traditional networking. Understanding why certain questions appear in the FAQ is as valuable as knowing the answers, because it helps you build correct mental models of how Cilium works.

The most common FAQ topics cluster around three themes: installation and kernel requirements (which are stricter than most CNIs), network policy behavior (particularly around default-deny and policy ordering), and performance questions (when L7 policy adds latency and when it does not). By explaining the reasoning behind FAQ answers rather than just listing them, this post helps you troubleshoot novel issues by analogy rather than by pattern-matching to known questions.

## Prerequisites

- Basic Cilium familiarity
- A Kubernetes cluster with Cilium installed (for testing FAQ scenarios)

## FAQ Category 1: Kernel Requirements

**Q: What Linux kernel version does Cilium require?**

Cilium requires a minimum kernel version that varies by feature. For current Cilium releases, the base requirement is Linux 5.10+ or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel, but some important features require newer kernels:

```bash
# Check your kernel version

uname -r

# Check the Cilium agent status from a Cilium pod
kubectl -n kube-system exec ds/cilium -- cilium-dbg status

# Multicast support requires 5.10+ on AMD64
# IPv6 BIG TCP requires 5.19+
# IPv4 BIG TCP requires 6.3+
# WireGuard requires in-kernel WireGuard support on Linux 5.6+,
# or an out-of-tree WireGuard module on older kernels
```

**Why this comes up**: Cilium's eBPF programs depend on kernel features added over time. Unlike iptables-based CNIs that work on older kernels, Cilium's capabilities are gated by the available BPF hooks.

## FAQ Category 2: Policy Behavior

**Q: Why does my pod lose connectivity after applying a CiliumNetworkPolicy?**

```bash
# When you select an endpoint with a CiliumNetworkPolicy,
# it enters default-deny mode for the direction covered by the policy.
# Traffic in that direction that is not explicitly allowed is dropped.

# Check current policy enforcement mode
kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint list

# View what policy is applied to the endpoint
kubectl get ciliumnetworkpolicies.cilium.io -A

# Inspect the realized policy for a specific endpoint
kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint get <endpoint-id>
```

**Why this comes up**: The transition to default-deny mode for a selected direction when a `CiliumNetworkPolicy` is applied surprises users who expect NetworkPolicy to only add rules, not change the default mode.

## FAQ Category 3: DNS Policy

**Q: How do I write a policy that allows access to external services by hostname?**

```yaml
# Use CiliumNetworkPolicy with toFQDNs
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-external-api
spec:
  endpointSelector:
    matchLabels:
      app: my-service
  egress:
  - toEndpoints:
    - matchLabels:
        k8s:io.kubernetes.pod.namespace: kube-system
        k8s:k8s-app: kube-dns
    toPorts:
    - ports:
      - port: "53"
        protocol: ANY
      rules:
        dns:
        - matchPattern: "*"
  - toFQDNs:
    - matchName: "api.example.com"
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP
```

```bash
# Verify DNS policy is working
kubectl -n kube-system exec ds/cilium -- cilium-dbg fqdn cache list
```

## FAQ Category 4: Hubble and Observability

**Q: How do I see which flows are being dropped?**

```bash
# Enable Hubble
cilium hubble enable

# Watch drops in real time
hubble observe --verdict DROPPED --follow

# Or use cilium monitor
kubectl -n kube-system exec ds/cilium -- cilium-dbg monitor --type drop
```

## Conclusion

The Cilium FAQ reflects real-world pain points that arise from Cilium's unique architecture. Kernel requirements, policy enforcement modes, DNS-aware policies, and observability tooling are the areas where Cilium differs most from other CNIs. By understanding why these questions arise - rooted in eBPF kernel dependencies and identity-based policy model differences - you develop the architectural intuition needed to diagnose novel issues without relying on a FAQ lookup.
