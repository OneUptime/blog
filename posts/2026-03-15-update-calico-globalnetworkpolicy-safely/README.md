# How to Update the Calico GlobalNetworkPolicy Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, GlobalNetworkPolicy, Kubernetes, Security, Network Policy, Operations

Description: Safely update Calico GlobalNetworkPolicy resources to modify cluster-wide security rules without causing connectivity outages.

---

## Introduction

Calico GlobalNetworkPolicy resources enforce security rules across the entire cluster, which means an incorrect update can immediately block legitimate traffic to every namespace. Unlike namespace-scoped policies, a misconfigured GlobalNetworkPolicy has cluster-wide blast radius, potentially disrupting all workloads simultaneously.

The most common causes of outages from GlobalNetworkPolicy updates include accidentally narrowing selectors that no longer match required traffic, changing the policy order so deny rules take precedence over allow rules, and removing egress rules that pods depend on for DNS or API server access.

This guide provides a structured approach to updating GlobalNetworkPolicy resources safely, with pre-update validation, staged rollout strategies, and immediate rollback procedures.

## Prerequisites

- A running Kubernetes cluster with Calico CNI
- Existing GlobalNetworkPolicy resources to update
- `calicoctl` installed and configured
- `kubectl` with cluster-admin privileges

## Backing Up All Policies

Before any change, create a complete backup of all GlobalNetworkPolicy resources:

```bash
calicoctl get globalnetworkpolicy -o yaml > gnp-backup-$(date +%Y%m%d-%H%M%S).yaml
```

Verify the backup file is complete:

```bash
grep -c "kind: GlobalNetworkPolicy" gnp-backup-*.yaml
calicoctl get globalnetworkpolicy --no-headers | wc -l
```

## Reviewing Current Policy State

Examine the policy you plan to update and its relationship with other policies:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep -E "name:|order:" | paste - -
```

View the specific policy:

```bash
calicoctl get globalnetworkpolicy default-deny-all -o yaml
```

Example existing policy:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-all
spec:
  order: 1000
  selector: all()
  types:
    - Ingress
    - Egress
```

## Testing Changes with a Staging Policy

Instead of modifying the existing policy directly, create a new policy with a higher order number to test the rule changes:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: updated-egress-rules-staging
spec:
  order: 999
  selector: "environment == 'staging'"
  types:
    - Egress
  egress:
    - action: Allow
      protocol: TCP
      destination:
        ports:
          - 443
          - 80
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    - action: Deny
```

Apply the staging policy and test with staging workloads first:

```bash
calicoctl apply -f staging-policy.yaml
kubectl label namespace staging environment=staging
kubectl run test -n staging --image=busybox --restart=Never -- wget -qO- --timeout=5 https://kubernetes.default.svc
kubectl logs -n staging test
kubectl delete pod -n staging test
```

## Updating the Policy Order Safely

When changing a policy's order, be aware that this affects which rules are evaluated first. Lower numbers have higher priority:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns
spec:
  order: 50
  selector: all()
  types:
    - Egress
  egress:
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    - action: Allow
      protocol: TCP
      destination:
        ports:
          - 53
```

Before applying, verify no existing policies at the same order number will conflict:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep "order:" | sort -n | uniq -c
```

```bash
calicoctl apply -f allow-dns-updated.yaml
```

## Modifying Selectors Carefully

When updating a policy selector, first verify which pods the new selector matches:

```bash
# Check what the current selector matches
kubectl get pods --all-namespaces -l role=backend --no-headers | wc -l

# Check what the new selector would match
kubectl get pods --all-namespaces -l app=backend --no-headers | wc -l
```

Then update the policy:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-backend-ingress
spec:
  order: 200
  selector: "app == 'backend'"
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: "app == 'frontend'"
      destination:
        ports:
          - 8080
```

```bash
calicoctl apply -f backend-ingress-updated.yaml
```

## Adding New Rules to Existing Policies

When adding rules to an existing policy, append them rather than replacing the entire rule set:

```bash
calicoctl get globalnetworkpolicy allow-egress -o yaml > allow-egress-current.yaml
```

Edit the file to add the new rule, then apply:

```bash
calicoctl apply -f allow-egress-current.yaml
```

## Immediate Rollback Procedure

If the update causes connectivity issues, restore from backup immediately:

```bash
calicoctl apply -f gnp-backup-20260315-120000.yaml
```

If the API server is unreachable due to the policy change, and you have direct node access:

```bash
# On a control plane node with calicoctl configured
calicoctl apply -f /path/to/gnp-backup.yaml
```

## Verification

After applying the update, run connectivity checks:

```bash
# Verify DNS resolution
kubectl run dns-check --image=busybox --restart=Never -- nslookup kubernetes.default.svc
kubectl logs dns-check
kubectl delete pod dns-check

# Verify pod-to-pod communication
kubectl run server --image=nginx --restart=Never --port=80
kubectl expose pod server --port=80
kubectl run client --image=busybox --restart=Never -- wget -qO- --timeout=5 http://server
kubectl logs client
kubectl delete pod client server
kubectl delete svc server
```

Confirm no unexpected denies in Felix logs:

```bash
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=30 | grep -i "deny"
```

## Troubleshooting

If traffic is blocked after the update, identify which policy is responsible:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep -B 2 -A 10 "action: Deny"
```

If the selector change excluded pods that should be covered, check the pod labels:

```bash
kubectl get pods --all-namespaces --show-labels | grep -v "Running"
```

If the order change caused unexpected precedence, list all policies sorted by order:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep -E "name:|order:" | paste - - | sort -t: -k4 -n
```

Remove the staging policy after testing is complete:

```bash
calicoctl delete globalnetworkpolicy updated-egress-rules-staging
```

## Conclusion

Updating GlobalNetworkPolicy resources demands careful planning due to their cluster-wide impact. Always back up existing policies, test changes in staging first, and have a rollback procedure ready before applying updates to production. Verify DNS, API server access, and pod-to-pod connectivity immediately after every change to catch issues before they escalate.
