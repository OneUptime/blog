# How to Update the Calico StagedNetworkPolicy Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, StagedNetworkPolicy, Kubernetes, Network Policy, Safe Updates, Security

Description: Best practices for safely updating Calico StagedNetworkPolicy resources with backup, validation, and rollback procedures.

---

## Introduction

Updating a StagedNetworkPolicy in Calico Enterprise requires careful handling to ensure that the staged changes accurately reflect your intended modifications. Since staged policies are namespace-scoped and use Calico's native policy syntax with ordered rule evaluation, a misplaced rule or incorrect selector can have cascading effects once committed.

Safe update practices include exporting the current state, making targeted modifications, validating the changes with dry-runs, and reviewing the updated policy against flow logs. The staging mechanism provides a buffer, but disciplined updates prevent errors from accumulating in the staged policy set.

This guide covers safe update workflows for StagedNetworkPolicy resources, including rule reordering, selector changes, and multi-rule modifications.

## Prerequisites

- Kubernetes cluster with Calico Enterprise
- `calicoctl` CLI configured
- Existing StagedNetworkPolicy resources to update
- `kubectl` access to target namespaces
- Flow logs enabled for impact analysis

## Exporting the Current Policy State

Before updating, always create a backup of the existing staged policy:

```bash
calicoctl get stagednetworkpolicy allow-frontend-to-api -n production -o yaml > allow-frontend-backup.yaml
```

For all staged policies in a namespace:

```bash
calicoctl get stagednetworkpolicies -n production -o yaml > all-staged-policies-backup.yaml
```

## Updating Rule Actions

Change a rule from Allow to Log to test logging before enforcement:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  stagedAction: Set
  order: 100
  selector: app == 'api-server'
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'frontend'
      destination:
        ports:
          - 8080
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'mobile-backend'
      destination:
        ports:
          - 8080
    - action: Log
      protocol: TCP
      source:
        selector: has(internal)
      destination:
        ports:
          - 8080
```

Apply the update:

```bash
calicoctl apply -f allow-frontend-to-api-updated.yaml
```

## Modifying Policy Order

When adjusting the evaluation order, be cautious as this affects which policies take precedence:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  stagedAction: Set
  order: 50
  selector: app == 'api-server'
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'frontend'
      destination:
        ports:
          - 8080
```

Verify the order relative to other policies:

```bash
calicoctl get stagednetworkpolicies -n production -o yaml | grep -E "name:|order:"
```

## Updating Selectors Incrementally

When broadening or narrowing a policy's scope, update the selector carefully:

```bash
# Check which pods currently match
kubectl get pods -n production -l app=api-server -o name

# Check which pods would match the new selector
kubectl get pods -n production -l 'app in (api-server, grpc-server)' -o name
```

Then update the policy selector:

```yaml
spec:
  selector: app in {'api-server', 'grpc-server'}
```

## Verification

Confirm the update was applied:

```bash
calicoctl get stagednetworkpolicy allow-frontend-to-api -n production -o yaml
```

Compare the updated version against the backup:

```bash
diff <(calicoctl get stagednetworkpolicy allow-frontend-to-api -n production -o yaml) allow-frontend-backup.yaml
```

Verify the policy order is correct relative to other namespace policies:

```bash
calicoctl get stagednetworkpolicies -n production -o wide
```

## Troubleshooting

If the update results in a validation error, check the Calico selector syntax. Common mistakes include using Kubernetes label selector format instead of Calico format:

```bash
# Wrong: Kubernetes format
selector: app=api-server

# Correct: Calico format
selector: app == 'api-server'
```

If a rule update causes unexpected flow matches in the staging preview, review the rule order. Calico evaluates rules top to bottom within a policy, and the first matching rule is applied.

To roll back an update, apply the backup:

```bash
calicoctl apply -f allow-frontend-backup.yaml
```

## Conclusion

Safely updating StagedNetworkPolicy resources requires backing up the current state, making targeted changes, and validating through diffs and flow log analysis. Pay close attention to rule ordering and selector syntax, as these are the most common sources of errors. The staged mechanism provides a safety net, but thorough validation at the staging phase prevents issues from reaching production enforcement.
