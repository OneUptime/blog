# How to Avoid Common Mistakes with Kubernetes Ingress with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Ingress, CNI, Troubleshooting, Best Practices, Network Policy

Description: The most common Calico ingress policy mistakes, from broken health checks to policy selector mismatches, and how to diagnose and prevent them.

---

## Introduction

Ingress policy mistakes in Calico fall into two categories: policies that block too much (breaking legitimate traffic) and policies that allow too much (creating security gaps). Both are common, and both are preventable with proper policy design and testing.

The most dangerous category is allowing too much — teams sometimes write policies that appear restrictive but contain selector mistakes that make them effectively open. This post covers the most common mistakes in both categories.

## Prerequisites

- A Calico cluster with ingress NetworkPolicy applied
- `kubectl` and `calicoctl` access for diagnostics
- Understanding of Kubernetes label selectors

## Mistake 1: Forgetting to Allow Kubelet Health Checks

When a deny-all ingress policy is applied, it blocks not only pod-to-pod traffic but also the kubelet's health check probes. Pods then fail their liveness and readiness checks and are marked as not ready.

**Symptom**: Pods go into a restart loop after applying deny-all ingress. `kubectl describe pod` shows `Liveness probe failed` or `Readiness probe failed`.

**Fix**: Add an explicit ingress allow for the health check port from the node's subnet:

```yaml
ingress:
- ports:
  - port: 8080  # Your health check port
    protocol: TCP
  from:
  - ipBlock:
      cidr: 10.0.0.0/8  # Node subnet CIDR
```

## Mistake 2: Empty `podSelector` in `from` Allows All Pods

A common misunderstanding: an empty `podSelector: {}` in a `from` clause means "allow from all pods in the namespace," not "allow from no pods." This creates an unintentionally permissive allow rule.

**Symptom**: Pods can receive connections from unexpected sources.

**Example of the mistake**:
```yaml
# This allows ALL pods in the namespace, not just the intended ones
ingress:
- from:
  - podSelector: {}  # Matches ALL pods in the namespace
```

**Fix**: Use a specific label selector, or use `namespaceSelector` to restrict to specific namespaces:
```yaml
ingress:
- from:
  - podSelector:
      matchLabels:
        app: frontend  # Only allows from pods with this label
```

## Mistake 3: NetworkPolicy Union Semantics Creating Unexpected Access

If two NetworkPolicies both select the same pod, their ingress rules are merged with union (OR) semantics. A policy added by one team can inadvertently grant access that another team's policy intended to deny.

**Symptom**: Traffic is allowed that you expected to be denied, even though you have a restrictive policy.

**Diagnosis**:
```bash
# Check all NetworkPolicies that select the target pod
kubectl get networkpolicy -o json | \
  jq '.items[] | select(.spec.podSelector.matchLabels.app == "target")'
```

**Fix**: Use Calico Enterprise's tiered policy model to prevent unexpected policy interactions between teams.

## Mistake 4: Cross-Namespace Selector Requires Both `namespaceSelector` AND `podSelector`

A common mistake is using `namespaceSelector` alone in a `from` clause, thinking it selects specific pods from that namespace. In reality, `namespaceSelector` alone selects ALL pods in the matching namespaces.

```yaml
# This is wrong — allows ALL pods from the frontend namespace
ingress:
- from:
  - namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: frontend

# This is correct — allows only pods with app=frontend from that namespace
ingress:
- from:
  - namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: frontend
    podSelector:
      matchLabels:
        app: frontend
```

Note: when `namespaceSelector` and `podSelector` are in the same `from` entry (not separate entries), they are ANDed. Separating them into different `from` entries would OR them.

## Mistake 5: Applying NetworkPolicy Without Testing the Deny Case

Teams often only test that their allow rules work (the positive case) without testing that the deny case is actually enforced. A misconfigured policy can appear to work while still allowing unintended traffic.

**Fix**: For every ingress policy, run two tests:
1. Confirm the allowed source can connect
2. Confirm a source that should be denied cannot connect

## Best Practices

- Include health check port allows in your namespace creation NetworkPolicy template
- Audit all NetworkPolicies in a namespace before adding a new one to understand existing access grants
- Use `kubectl get networkpolicy -o wide` regularly to review what policies are active
- Test both allow and deny cases for every policy change

## Conclusion

The most impactful Calico ingress mistakes are broken health checks (forgot to allow kubelet probes), empty podSelector misunderstanding (allows all pods unexpectedly), policy union semantics surprises, cross-namespace selector syntax errors, and incomplete testing. Building a policy template that includes health check allows and mandatory deny-case testing in your validation suite prevents most of these incidents.
