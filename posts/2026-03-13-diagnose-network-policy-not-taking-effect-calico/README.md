# How to Diagnose Network Policy Not Taking Effect in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting

Description: Diagnose why Calico NetworkPolicies are not being enforced by examining Felix status, policy sync state, and iptables rule generation.

---

## Introduction

When a Calico NetworkPolicy is applied but traffic continues to flow or be blocked unexpectedly, the policy is not taking effect. This can happen when Felix is not running, the policy is not being synced to the datastore, the pod selector does not match the intended pods, or the policy ordering is not as expected.

Policy not taking effect is particularly insidious because it can mean either: traffic that should be blocked is still flowing (security risk), or traffic that should flow is still blocked (functionality impact). Both require diagnosing why Felix is not applying the expected rules.

## Symptoms

- Network traffic flows between pods that should be blocked by a policy
- Traffic that should be allowed is blocked despite an allow policy being applied
- `kubectl get networkpolicy` shows the policy but it has no effect
- Traffic behavior does not change after applying or deleting a policy

## Root Causes

- Pod label selector in policy does not match the target pods
- Felix is not running or not healthy on the affected node
- Policy is being applied to wrong namespace
- Calico policy ordering issue: an earlier ordered Calico policy allows, denies, or passes the traffic before the applied policy is reached
- calico-node pod restarting and Felix in the process of re-syncing rules
- `policyTypes` field omitted or not set for the intended traffic direction

## Diagnosis Steps

**Step 1: Verify the policy exists and targets the right pods**

```bash
kubectl get networkpolicy <policy-name> -n <namespace> -o yaml
kubectl get pods -n <namespace> --show-labels | grep "<selector-label>"
```

**Step 2: Check if Felix is healthy on the pod's node**

```bash
POD_NODE=$(kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.nodeName}')
CALICO_NS=$(kubectl get pods -A -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.namespace}')
NODE_POD=$(kubectl get pods -n "$CALICO_NS" -l k8s-app=calico-node \
  --field-selector spec.nodeName=$POD_NODE -o name)
kubectl exec "$NODE_POD" -n "$CALICO_NS" -- wget -qO- http://localhost:9099/readiness 2>/dev/null
```

**Step 3: Check iptables rules on the node**

```bash
ssh "$POD_NODE" "sudo iptables-save | grep -E 'cali-pi-|cali-po-'"
# On Linux iptables dataplane clusters, look for Calico policy chains being generated.
```

**Step 4: Check policy labels and selectors**

```bash
# Get the pod's labels
kubectl get pod <pod-name> -n <namespace> --show-labels

# Compare with policy selector
kubectl get networkpolicy <policy-name> -n <namespace> \
  -o jsonpath='{.spec.podSelector.matchLabels}'
```

**Step 5: Check Calico policy with calicoctl**

```bash
calicoctl get networkpolicy -n <namespace> -o wide
calicoctl get networkpolicy -n <namespace> <calico-policy-name> -o yaml
# Kubernetes NetworkPolicies are additive, while Calico policies can use order and deny/pass actions.
```

**Step 6: Check GlobalNetworkPolicies that might override**

```bash
calicoctl get globalnetworkpolicy -o yaml | grep -E "order:|Allow|Pass|Deny"
```

```mermaid
flowchart TD
    A[Policy not taking effect] --> B[Verify policy targets correct pods]
    B --> C{Selector matches pods?}
    C -- No --> D[Fix pod selector in policy]
    C -- Yes --> E[Check Felix health on pod's node]
    E --> F{Felix healthy?}
    F -- No --> G[Fix Felix - see Felix runbook]
    F -- Yes --> H[Check iptables rules on node]
    H --> I{Rules present?}
    I -- No --> J[Felix not syncing - check logs]
    I -- Yes --> K[Check policy ordering]
```

## Solution

After identifying the specific issue (selector mismatch, Felix health, or ordering), apply the targeted fix from the companion Fix post.

## Prevention

- Test NetworkPolicy with a known allow/block scenario in staging before production
- Use `kubectl describe networkpolicy` to verify selector matches before applying
- Add temporary Calico `Log` rules or enable flow logs to observe traffic decisions

## Conclusion

Diagnosing network policy not taking effect requires checking selector accuracy, Felix health, iptables rule presence, and policy ordering. The selector mismatch is the most common cause and is quickly diagnosed by comparing pod labels against the policy selector.
