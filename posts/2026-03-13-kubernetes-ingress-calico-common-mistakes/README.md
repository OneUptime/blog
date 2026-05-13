# How to Avoid Common Mistakes with Kubernetes Ingress with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Ingress, CNI, Troubleshooting, Best Practice, Network Policy

Description: The most common Calico ingress policy mistakes, from broken health checks to policy selector mismatches, and how to diagnose and prevent them.

---

## Introduction

Ingress policy mistakes in Calico fall into two categories: policies that block too much (breaking legitimate traffic) and policies that allow too much (creating security gaps). Both are common, and both are preventable with proper policy design and testing.

The most dangerous category is allowing too much - teams sometimes write policies that appear restrictive but contain selector mistakes that make them effectively open. This post covers the most common mistakes in both categories.

## Prerequisites

- A Calico cluster with ingress NetworkPolicy applied
- `kubectl` and `calicoctl` access for diagnostics
- Understanding of Kubernetes label selectors

## Mistake 1: Assuming Deny-All Ingress Blocks Kubelet Health Checks

When a Kubernetes deny-all ingress NetworkPolicy is applied, it blocks pod-to-pod traffic that is not explicitly allowed. It does not block traffic from the pod's resident node, so kubelet liveness and readiness probes from that node are not denied by Kubernetes NetworkPolicy.

**Symptom**: Pods go into a restart loop after applying deny-all ingress. `kubectl describe pod` shows `Liveness probe failed` or `Readiness probe failed`, but the failure is usually caused by the application losing access to a dependency, by an incorrect probe configuration, or by separate host/firewall policy rather than by Kubernetes NetworkPolicy blocking the kubelet probe itself.

**Fix**: Do not add broad node-subnet allows solely for kubelet probes in a Kubernetes NetworkPolicy. Instead, diagnose the probe failure directly and add only the pod-to-pod or egress allows the application needs. If you also use Calico host endpoint policy or other host-level firewall rules, make sure those rules allow the required node-to-pod health check traffic.

```yaml
# Deny-all ingress isolates selected pods from pod/network sources.
# It does not block traffic from the pod's resident node.
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
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
# List policies in the target namespace, then inspect selectors.
# Remember that podSelector: {} also selects the target pod.
kubectl get networkpolicy -n <namespace> -o wide
kubectl describe networkpolicy -n <namespace>
```

**Fix**: Use Calico's tiered policy model to prevent unexpected policy interactions between teams.

## Mistake 4: Cross-Namespace Selector Requires Both `namespaceSelector` AND `podSelector`

A common mistake is using `namespaceSelector` alone in a `from` clause, thinking it selects specific pods from that namespace. In reality, `namespaceSelector` alone selects ALL pods in the matching namespaces.

```yaml
# This is wrong - allows ALL pods from the frontend namespace
ingress:
- from:
  - namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: frontend

# This is correct - allows only pods with app=frontend from that namespace
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

- Do not add broad node-subnet allows for kubelet probes in Kubernetes NetworkPolicy; only add host-level health check allows when you use host endpoint or firewall policy that can block them
- Audit all NetworkPolicies in a namespace before adding a new one to understand existing access grants
- Use `kubectl get networkpolicy -o wide` regularly to review what policies are active
- Test both allow and deny cases for every policy change

## Conclusion

The most impactful Calico ingress mistakes are misdiagnosed health check failures, empty podSelector misunderstanding (allows all pods unexpectedly), policy union semantics surprises, cross-namespace selector syntax errors, and incomplete testing. Building a policy template with the right application allows and mandatory deny-case testing in your validation suite prevents most of these incidents.
