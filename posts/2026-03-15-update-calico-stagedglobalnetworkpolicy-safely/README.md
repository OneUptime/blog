# How to Update the Calico StagedGlobalNetworkPolicy Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, StagedGlobalNetworkPolicy, Kubernetes, Network Policy, Security, DevOps

Description: Learn how to safely update Calico StagedGlobalNetworkPolicy resources with proper validation, diff review, and rollback strategies.

---

## Introduction

The StagedGlobalNetworkPolicy resource in Calico Enterprise allows you to preview network policy changes before they take effect across the entire cluster. Unlike regular GlobalNetworkPolicy resources, staged policies sit in a pending state until explicitly committed, giving teams time to validate rules against live traffic.

Updating staged policies requires careful handling because incorrect modifications can lead to unexpected traffic blocking or allowing once committed. A safe update workflow involves reviewing the current policy state, applying changes incrementally, validating the staged diff, and confirming the update through the Calico management plane.

This guide walks through a systematic approach to updating StagedGlobalNetworkPolicy resources with minimal risk to production workloads.

## Prerequisites

- Kubernetes cluster with Calico Enterprise installed
- `kubectl` configured with cluster access
- `calicoctl` CLI installed and configured
- Permissions to manage StagedGlobalNetworkPolicy resources
- Familiarity with Calico network policy syntax

## Reviewing the Current Staged Policy

Before making any updates, retrieve the existing StagedGlobalNetworkPolicy to understand its current rules.

```bash
kubectl get stagedglobalnetworkpolicies -o wide
```

Export the specific policy you plan to update:

```bash
calicoctl get stagedglobalnetworkpolicy allow-dns-egress -o yaml > allow-dns-egress-backup.yaml
```

Here is an example of an existing StagedGlobalNetworkPolicy:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedGlobalNetworkPolicy
metadata:
  name: allow-dns-egress
spec:
  stagedAction: Set
  order: 100
  selector: all()
  types:
    - Egress
  egress:
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
```

## Applying an Incremental Update

When updating a staged policy, modify only the fields that need to change. For example, to add TCP DNS support alongside existing UDP rules:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedGlobalNetworkPolicy
metadata:
  name: allow-dns-egress
spec:
  stagedAction: Set
  order: 100
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

Apply the update:

```bash
calicoctl apply -f allow-dns-egress-updated.yaml
```

## Validating the Staged Changes

After applying, verify the staged policy reflects your changes:

```bash
calicoctl get stagedglobalnetworkpolicy allow-dns-egress -o yaml
```

Check the stagedAction field to confirm the policy is still in staged mode and has not been accidentally committed. Use the Calico Enterprise UI to review the policy diff, which shows what traffic would be affected once the policy is committed.

```bash
kubectl describe stagedglobalnetworkpolicy allow-dns-egress
```

## Verification

Validate the update by confirming the staged policy exists and contains the expected rules:

```bash
calicoctl get stagedglobalnetworkpolicy allow-dns-egress -o yaml | grep -A 5 "egress"
```

Check that no validation errors were reported:

```bash
kubectl get events --field-selector reason=StagedPolicyValidation
```

Run a dry-run commit to preview what would change in the active policy set:

```bash
calicoctl get stagedglobalnetworkpolicies -o yaml | grep stagedAction
```

## Troubleshooting

If the update fails to apply, check for YAML syntax errors:

```bash
calicoctl validate -f allow-dns-egress-updated.yaml
```

If the policy shows an unexpected stagedAction, verify you have not accidentally set it to `Delete` instead of `Set`. To restore the original policy from your backup:

```bash
calicoctl apply -f allow-dns-egress-backup.yaml
```

If permission errors occur, verify your RBAC bindings include the `stagedglobalnetworkpolicies` resource in the `projectcalico.org` API group.

## Conclusion

Safely updating StagedGlobalNetworkPolicy resources requires a disciplined workflow: back up the existing policy, apply targeted changes, validate the staged diff, and only commit when confident. This staged approach prevents accidental traffic disruption and gives network security teams a reliable review process before policies go live across the cluster.
