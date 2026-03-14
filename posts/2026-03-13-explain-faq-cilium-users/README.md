# Explaining the Cilium FAQ: Common Questions and Why They Come Up

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, FAQ, eBPF, Networking, Troubleshooting

Description: An explanation of the most common Cilium FAQ topics, why these questions arise, and what the answers reveal about Cilium's architecture.

---

## Introduction

The Cilium FAQ is not just a list of answers — each question in it represents a pattern of confusion that arises from genuine architectural differences between Cilium and what users expect from traditional networking. Understanding why certain questions appear in the FAQ is as valuable as knowing the answers, because it helps you build correct mental models of how Cilium works.

The most common FAQ topics cluster around three themes: installation and kernel requirements (which are stricter than most CNIs), network policy behavior (particularly around default-deny and policy ordering), and performance questions (when L7 policy adds latency and when it does not). By explaining the reasoning behind FAQ answers rather than just listing them, this post helps you troubleshoot novel issues by analogy rather than by pattern-matching to known questions.

## Prerequisites

- Basic Cilium familiarity
- A Kubernetes cluster with Cilium installed (for testing FAQ scenarios)

## FAQ Category 1: Kernel Requirements

**Q: What Linux kernel version does Cilium require?**

Cilium requires a minimum kernel version that varies by feature. The base requirement is 4.9.17+, but many important features require newer kernels:

```bash
# Check your kernel version
uname -r

# Check Cilium kernel requirements for your version
cilium status | grep -i kernel

# BPF host routing requires 5.10+
# WireGuard encryption requires 5.6+
# Socket LB requires 4.19.57+
```

**Why this comes up**: Cilium's eBPF programs depend on kernel features added over time. Unlike iptables-based CNIs that work on older kernels, Cilium's capabilities are gated by the available BPF hooks.

## FAQ Category 2: Policy Behavior

**Q: Why does my pod lose connectivity after applying a CiliumNetworkPolicy?**

```bash
# When you select an endpoint with a CiliumNetworkPolicy,
# it enters "policy-enforcement: always" mode
# All traffic not explicitly allowed is dropped

# Check current policy enforcement mode
kubectl exec -n kube-system ds/cilium -- cilium endpoint list | grep policy

# View what policy is applied to the endpoint
kubectl exec -n kube-system ds/cilium -- cilium policy get

# Trace a specific flow
kubectl exec -n kube-system ds/cilium -- cilium policy trace \
  --src-k8s-pod default:my-pod \
  --dst-k8s-pod default:target-pod \
  --dport 443
```

**Why this comes up**: The transition to "policy-enforcement: always" when a `CiliumNetworkPolicy` is applied surprises users who expect NetworkPolicy to only add rules, not change the default mode.

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
  - toFQDNs:
    - matchName: "api.example.com"
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP
```

```bash
# Verify DNS policy is working
kubectl exec -n kube-system ds/cilium -- cilium fqdn cache list
```

## FAQ Category 4: Hubble and Observability

**Q: How do I see which flows are being dropped?**

```bash
# Enable Hubble
cilium hubble enable

# Watch drops in real time
hubble observe --verdict DROPPED --follow

# Or use cilium monitor
kubectl exec -n kube-system ds/cilium -- cilium monitor --type drop
```

## Conclusion

The Cilium FAQ reflects real-world pain points that arise from Cilium's unique architecture. Kernel requirements, policy enforcement modes, DNS-aware policies, and observability tooling are the areas where Cilium differs most from other CNIs. By understanding why these questions arise — rooted in eBPF kernel dependencies and identity-based policy model differences — you develop the architectural intuition needed to diagnose novel issues without relying on a FAQ lookup.
