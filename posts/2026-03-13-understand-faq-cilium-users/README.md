# Understand the Cilium User FAQ

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, FAQ, Troubleshooting, Kubernetes

Description: A comprehensive guide to the most frequently asked questions from Cilium users, covering installation issues, policy behavior, performance, and debugging common problems.

---

## Introduction

As Cilium has grown to become one of the most widely deployed CNI plugins in production Kubernetes environments, a rich body of frequently asked questions has emerged from the community. These questions span installation challenges, network policy debugging, performance optimization, and integration with other Kubernetes components.

Understanding the Cilium FAQ isn't just about resolving issues - it's about building mental models for how Cilium works. Many FAQ questions reveal important architectural insights: why certain eBPF programs are loaded, how Cilium interacts with kube-proxy, why health checks behave differently with Cilium policies applied, and how Cilium's dataplane model differs from traditional CNIs.

This guide covers the most impactful FAQ topics for Cilium users, organized by category to help you quickly find answers to common questions and understand the reasoning behind Cilium's behavior.

## Prerequisites

- Cilium installed on a Kubernetes cluster
- `cilium` CLI installed
- `kubectl` configured with cluster access
- Basic understanding of Kubernetes networking concepts

## Frequently Asked Questions

### Installation and Setup

**Q: Why does Cilium require a specific kernel version?**

Cilium relies on eBPF, which requires kernel features introduced in Linux 4.9+. Advanced features like kube-proxy replacement and L7 policy require kernel 5.3+.

```bash
# Check your kernel version to verify compatibility
uname -r

# Check what Cilium features are available on your kernel
cilium status --verbose | grep "Kernel"
```

**Q: How do I verify Cilium is working correctly after installation?**

```bash
# Run the official Cilium connectivity test suite
cilium connectivity test

# Check overall Cilium status
cilium status

# Verify all Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium
```

### Network Policy Behavior

**Q: Why are my pods not receiving traffic after applying a CiliumNetworkPolicy?**

Cilium policies use a default-deny model once any policy selects a pod. Check whether your policy has correct ingress/egress rules.

```bash
# Check which policies are selecting a specific pod
kubectl get ciliumnetworkpolicies -A -o yaml | grep -A 5 "selector"

# Inspect Cilium endpoint policy for a specific pod
POD_IP=$(kubectl get pod <pod-name> -o jsonpath='{.status.podIP}')
cilium endpoint list | grep $POD_IP
```

**Q: Why can't my pods reach the Kubernetes API server after applying egress policies?**

When Cilium policies are applied to a pod, egress must be explicitly allowed - including to the API server.

```yaml
# Allow egress to the Kubernetes API server
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-kube-apiserver
spec:
  endpointSelector:
    matchLabels:
      app: my-app
  egress:
  - toEntities:
    # Allow egress to the API server (kube-apiserver)
    - kube-apiserver
```

### Performance Questions

**Q: Should I enable kube-proxy replacement?**

```bash
# Check if kube-proxy replacement is currently active
cilium status | grep "KubeProxyReplacement"

# View kube-proxy replacement mode
cilium config view | grep kube-proxy-replacement
```

Kube-proxy replacement with eBPF improves performance by handling service traffic in the kernel, avoiding user-space context switches.

### Debugging Common Issues

**Q: How do I see what traffic Cilium is dropping?**

```bash
# Use Hubble to observe dropped flows
hubble observe --verdict DROPPED --follow

# Use cilium monitor for low-level packet events
cilium monitor --type drop
```

**Q: Why does `cilium status` show some nodes as unreachable?**

```bash
# Check Cilium node connectivity
cilium connectivity test --test node-to-node

# Inspect individual node status
cilium node list
```

## Best Practices

- Always run `cilium connectivity test` after installation and upgrades
- Check `cilium status` before opening bug reports - it often shows the root cause
- Use Hubble observe with `--verdict DROPPED` to diagnose policy-related drops
- Consult the official Cilium documentation at docs.cilium.io before the community channels
- When upgrading, read the release notes carefully for breaking changes
- Join the Cilium Slack workspace for real-time community support

## Conclusion

The Cilium FAQ covers a wide range of topics from kernel requirements to network policy behavior and performance optimization. By understanding these common questions and their answers, you build a deeper understanding of how Cilium works and can diagnose issues more efficiently. For questions not covered here, the Cilium community is active on Slack, GitHub, and the official mailing list.
