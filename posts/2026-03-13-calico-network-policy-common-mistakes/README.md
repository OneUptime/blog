# How to Avoid Common Mistakes with Network Policy Fundamentals in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, CNI, Troubleshooting, Best Practices, Security

Description: The most common Calico network policy mistakes, from selector mismatches to union semantics surprises, and how to diagnose and prevent them.

---

## Introduction

Network policy mistakes range from policies that silently allow too much traffic (security risk) to policies that accidentally block legitimate traffic (reliability risk). Both categories occur because of the counterintuitive aspects of Kubernetes' policy model: union semantics, implicit deny on policy selection, and the difference between empty and absent selectors.

This post covers the most common mistakes with concrete diagnostic commands and fixes.

## Prerequisites

- Active Calico cluster with NetworkPolicy applied
- `kubectl` and `calicoctl` for diagnostics
- Understanding of Calico's policy selector model

## Mistake 1: Relying on "Explicit Deny" in Kubernetes NetworkPolicy

Kubernetes NetworkPolicy does not have an explicit `deny` action - it only has allow rules, with an implicit deny for any traffic not matched. If you want to log denied traffic or write policy in a way that clearly expresses the deny intent, use Calico NetworkPolicy instead.

**Problem**: Cannot distinguish between "no policy match (implicit deny)" and "explicit deny" in Kubernetes NetworkPolicy. This makes auditing and troubleshooting harder.

**Fix**: Switch to Calico NetworkPolicy with explicit deny action:

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: explicit-deny-example
  namespace: default
spec:
  selector: app == 'sensitive-service'
  ingress:
  - action: Allow
    source:
      selector: app == 'authorized-client'
  - action: Deny  # Explicit, visible, loggable
```

## Mistake 2: Empty `namespaceSelector: {}` Matches All Namespaces

Similar to the `podSelector: {}` mistake, an empty `namespaceSelector: {}` in Kubernetes NetworkPolicy matches ALL namespaces - not just the local namespace. This is often used incorrectly when developers intend to match "same namespace":

```yaml
# Wrong: This allows traffic from ALL namespaces
ingress:
- from:
  - namespaceSelector: {}  # Matches every namespace
    podSelector:
      matchLabels:
        app: frontend

# Correct: Only allow from pods in the same namespace
ingress:
- from:
  - podSelector:
      matchLabels:
        app: frontend  # No namespaceSelector = same namespace only
```

## Mistake 3: Not Understanding Policy Union Semantics

If two NetworkPolicies both select the same pod, their ingress rules are OR'd - a packet is allowed if any policy allows it. Teams sometimes apply a restrictive policy expecting it to override a permissive one. It doesn't.

**Symptom**: A pod accepts connections you expected to be blocked, and you have a "restrictive" policy applied to it.

**Diagnosis**:
```bash
# Find ALL policies that select your pod
kubectl get networkpolicy -o json | jq '.items[] |
  select(.spec.podSelector.matchLabels.app == "your-app") | .metadata.name'
```

Any policy in this list that has a matching allow rule will grant access, regardless of other policies.

## Mistake 4: Policy Applied to Wrong Namespace

Calico NetworkPolicy (not Global) is namespace-scoped. If you apply a policy to the `default` namespace expecting it to affect pods in `production` namespace, it will have no effect.

**Diagnosis**:
```bash
# Verify the namespace of your policy
kubectl get networkpolicy --all-namespaces
calicoctl get networkpolicy --all-namespaces
```

**Fix**: Either apply the policy to the correct namespace or use `GlobalNetworkPolicy` for cross-namespace rules.

## Mistake 5: Missing `policyTypes` Field

Kubernetes NetworkPolicy with only `ingress` rules but no `policyTypes` field defaults to only controlling ingress. However, explicitly listing `policyTypes: [Ingress, Egress]` with an empty egress list causes a deny-all egress to also be applied.

```yaml
# Applying this policy creates BOTH a deny-all ingress AND deny-all egress
spec:
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from: [...]
  egress: []  # Empty list = deny all egress
```

If you only want to control ingress, only include `Ingress` in `policyTypes` or omit `policyTypes` entirely.

## Mistake 6: Using `calicoctl` and `kubectl` to Manage the Same Resources

Kubernetes NetworkPolicy can be managed with `kubectl`. Calico NetworkPolicy (`projectcalico.org/v3`) should be managed with `calicoctl`. Using `kubectl` to apply Calico's CRDs directly works, but `calicoctl` validates syntax and provides better error messages.

```bash
# Preferred for Calico resources
calicoctl apply -f my-calico-policy.yaml

# Works but skips Calico validation
kubectl apply -f my-calico-policy.yaml
```

## Best Practices

- Review all policies that select the same pod before adding a new one - union semantics can create unexpected access grants
- Use Calico NetworkPolicy with explicit deny for all security-sensitive policies
- Verify policy namespace explicitly: `kubectl get networkpolicy -n production`
- Always include `policyTypes` in Kubernetes NetworkPolicy to be explicit about which traffic directions are controlled

## Conclusion

The most common Calico network policy mistakes stem from misunderstanding union semantics, empty selector behavior, namespace scoping, and implicit deny semantics. Building diagnostic habits - checking all policies that select a pod, verifying namespace, testing both allow and deny cases - prevents these mistakes from causing security gaps or availability incidents in production.
