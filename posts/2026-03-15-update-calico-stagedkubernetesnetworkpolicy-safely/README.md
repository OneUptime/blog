# How to Update the Calico StagedKubernetesNetworkPolicy Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, StagedKubernetesNetworkPolicy, Kubernetes, Network Policy, Safe Updates, DevOps

Description: Safely update Calico StagedKubernetesNetworkPolicy resources using backup, diff review, and incremental change strategies.

---

## Introduction

Updating a StagedKubernetesNetworkPolicy in Calico Enterprise requires the same discipline as updating any production network policy, but with the added benefit of staged preview. Since these policies use the Kubernetes NetworkPolicy format, teams already familiar with standard network policies can update them using familiar patterns while leveraging Calico's staging capabilities.

A safe update workflow involves exporting the current staged policy, making targeted changes, applying the update, and validating the diff before committing. This prevents accidental rule removal or misconfiguration that could impact traffic once the policy is enforced.

This guide demonstrates safe update patterns for StagedKubernetesNetworkPolicy resources, including backup procedures, incremental modifications, and validation steps.

## Prerequisites

- Kubernetes cluster with Calico Enterprise
- `kubectl` configured with namespace-level access
- `calicoctl` CLI installed
- Existing StagedKubernetesNetworkPolicy resources to update
- RBAC permissions for stagedkubernetesnetworkpolicies resources

## Backing Up the Current Policy

Always export the current policy before making changes:

```bash
kubectl get stagedkubernetesnetworkpolicy allow-web-ingress -n production -o yaml > allow-web-ingress-backup.yaml
```

Store the backup with a timestamp for audit purposes:

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
kubectl get stagedkubernetesnetworkpolicy allow-web-ingress -n production -o yaml > "allow-web-ingress-${TIMESTAMP}.yaml"
```

## Adding New Ingress Rules

Update an existing staged policy to add a new ingress source. Start with the current policy and add additional rules:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: allow-web-ingress
  namespace: production
spec:
  stagedAction: Set
  podSelector:
    matchLabels:
      app: web-frontend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              purpose: ingress
      ports:
        - protocol: TCP
          port: 8080
    - from:
        - namespaceSelector:
            matchLabels:
              purpose: monitoring
      ports:
        - protocol: TCP
          port: 9090
```

Apply the update:

```bash
kubectl apply -f allow-web-ingress-updated.yaml
```

## Comparing Changes with Diff

After applying, compare the updated policy against your backup:

```bash
diff <(kubectl get stagedkubernetesnetworkpolicy allow-web-ingress -n production -o yaml) allow-web-ingress-backup.yaml
```

Use server-side dry-run to validate the update without persisting:

```bash
kubectl apply -f allow-web-ingress-updated.yaml --dry-run=server
```

## Modifying Pod Selectors Safely

When changing the podSelector, be cautious as this alters which workloads the policy targets:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: allow-web-ingress
  namespace: production
spec:
  stagedAction: Set
  podSelector:
    matchLabels:
      app: web-frontend
      version: v2
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              purpose: ingress
      ports:
        - protocol: TCP
          port: 8080
```

Verify the updated selector matches the intended pods:

```bash
kubectl get pods -n production -l app=web-frontend,version=v2
```

## Verification

Confirm the update was applied correctly:

```bash
kubectl get stagedkubernetesnetworkpolicy allow-web-ingress -n production -o yaml
```

Verify the resource version changed, indicating a successful update:

```bash
kubectl get stagedkubernetesnetworkpolicy allow-web-ingress -n production -o jsonpath='{.metadata.resourceVersion}'
```

Check for any warning events related to the update:

```bash
kubectl get events -n production --field-selector involvedObject.name=allow-web-ingress --sort-by='.lastTimestamp'
```

## Troubleshooting

If the update is rejected with a conflict error, re-fetch the latest version and reapply:

```bash
kubectl get stagedkubernetesnetworkpolicy allow-web-ingress -n production -o yaml > latest.yaml
# Edit latest.yaml with your changes
kubectl apply -f latest.yaml
```

If the podSelector change results in no matching pods, verify labels are correct:

```bash
kubectl get pods -n production --show-labels | grep web-frontend
```

To roll back to the previous version, apply the backup file:

```bash
kubectl apply -f allow-web-ingress-backup.yaml
```

## Conclusion

Safely updating StagedKubernetesNetworkPolicy resources requires a structured approach: back up first, make targeted changes, validate with diffs and dry-runs, and verify the update took effect. The staging mechanism provides an additional safety net since changes are not enforced until committed, but disciplined update practices prevent errors from reaching the commit stage in the first place.
