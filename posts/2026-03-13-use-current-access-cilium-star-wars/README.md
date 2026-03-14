# How to Observe and Analyze Current Access in the Cilium Star Wars Demo

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, eBPF, Networking, Observability, Security

Description: Learn to use Cilium's observability tools to map current access patterns in the Star Wars demo before applying network policies.

---

## Introduction

Before applying any network policy, you should understand the existing traffic patterns in your cluster. The Cilium Star Wars demo provides an excellent environment for practicing this baseline mapping exercise. Using Cilium's built-in observability tools, you can capture all traffic flows, identify which pods are communicating with which services, and document the access patterns that your policies will need to address.

This practice of "observe before restrict" is essential in production environments. Blindly applying default-deny policies without understanding current traffic will break applications and create incidents. Cilium's monitoring capabilities — including Hubble flow observability — make this baseline mapping straightforward and comprehensive.

This guide shows you how to use Cilium's tools to observe, record, and analyze the current access state of the Star Wars demo before a single policy is applied.

## Prerequisites

- Star Wars demo deployed with no policies applied
- Cilium installed with Hubble enabled
- `hubble` CLI installed (optional but recommended)
- `kubectl` configured

## Enabling Hubble Observability

```bash
# Enable Hubble on existing Cilium installation
cilium hubble enable

# Verify Hubble is running
cilium status | grep Hubble

# Port-forward to Hubble relay
cilium hubble port-forward &

# Verify hubble connectivity
hubble status
```

## Observing All Traffic Flows

```bash
# Watch all flows in real time
hubble observe --follow

# In another terminal, generate traffic from the demo pods
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
kubectl exec xwing -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port
```

## Filtering Flows by Namespace and Pod

```bash
# Observe flows to the deathstar service
hubble observe --namespace default --to-pod deathstar

# Observe flows from xwing
hubble observe --namespace default --from-pod xwing

# View HTTP flows specifically
hubble observe --namespace default --protocol http
```

## Using cilium monitor for Low-Level Visibility

```bash
# Monitor all packet events (before policy, mostly traces)
kubectl exec -n kube-system ds/cilium -- cilium monitor --type trace

# Filter for a specific pod
kubectl exec -n kube-system ds/cilium -- cilium monitor --related-to xwing
```

## Documenting Access Patterns

Use the observed flows to document a baseline access matrix:

| Source | Destination | Port | Method | Result |
|--------|-------------|------|--------|--------|
| tiefighter | deathstar:80 | 80 | POST /v1/request-landing | Allow |
| tiefighter | deathstar:80 | 80 | PUT /v1/exhaust-port | Allow |
| xwing | deathstar:80 | 80 | POST /v1/request-landing | Allow |
| xwing | deathstar:80 | 80 | PUT /v1/exhaust-port | Allow |

This matrix becomes your policy design document — each "Allow" that should be "Deny" is a policy rule to write.

## Conclusion

Observing current access before applying Cilium policies is not optional — it is the correct engineering practice. By leveraging Hubble and `cilium monitor`, you gain complete visibility into the traffic patterns the Star Wars demo generates. This baseline becomes the specification for your security policy, ensuring that you block what needs to be blocked without disrupting legitimate traffic. Apply this practice to every production environment before applying Cilium policies.
