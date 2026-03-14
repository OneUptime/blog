# How to Use flux-client-side-apply Field Manager for Manual Overrides

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, Field Manager, Server-Side Apply

Description: Use field managers to safely make manual changes to Flux-managed resources by understanding and working with Kubernetes server-side apply ownership.

---

## Introduction

Kubernetes server-side apply (SSA) is the mechanism that makes Flux's drift correction possible. Every field in a Kubernetes resource is owned by a specific field manager, and when two field managers try to own the same field, a conflict arises. Flux uses SSA to declare ownership of every field it manages from Git, ensuring those fields are always reconciled to their Git-declared values.

Understanding field managers unlocks the ability to make safe, intentional manual overrides that coexist with Flux. By using a different field manager for your manual changes, you can modify fields that Flux doesn't own without conflict. By explicitly transferring field ownership, you can control which tool manages which fields.

This guide explains the field manager model in depth and shows practical techniques for using field managers to make safe manual overrides in Flux-managed clusters.

## Prerequisites

- Flux CD v2 managing resources in your cluster
- kubectl 1.20+ (server-side apply support)
- Understanding of the conflict between Flux reconciliation and manual changes

## Step 1: Understand Flux's Field Manager

Flux uses a specific field manager name when applying resources.

```bash
# See all field managers for a deployment
kubectl get deployment my-service -n team-alpha \
  -o jsonpath='{.metadata.managedFields[*].manager}' | tr ' ' '\n'
# Output might include:
# kubectl-client-side-apply
# gotk-sync-manager
# kube-controller-manager

# See exactly which fields each manager owns
kubectl get deployment my-service -n team-alpha \
  -o json | jq '.metadata.managedFields[] | {manager: .manager, operation: .operation, fields: .fieldsV1}'
```

Flux uses the manager name `gotk-sync-manager` (or `manager` for older versions). Any field owned by Flux will be reconciled back to its Git-declared value.

## Step 2: Make Non-Conflicting Manual Changes

If you use server-side apply with a different field manager for fields that Flux doesn't own, your changes persist across reconciliations.

```bash
# Add an annotation that Flux doesn't manage - no conflict
kubectl annotate deployment my-service -n team-alpha \
  ops.acme.com/last-manual-restart="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --overwrite

# Add a label that Flux doesn't manage - no conflict
kubectl label deployment my-service -n team-alpha \
  ops.acme.com/debug-mode=enabled \
  --overwrite

# After Flux reconciles, check if the annotation persists
flux reconcile kustomization my-service -n team-alpha
kubectl get deployment my-service -n team-alpha \
  -o jsonpath='{.metadata.annotations.ops\.acme\.com/last-manual-restart}'
# Annotation persists - Flux doesn't own it
```

## Step 3: Use Server-Side Apply with a Custom Field Manager

For more complex manual changes, use `kubectl apply --server-side` with a custom field manager.

```yaml
# /tmp/my-service-override.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: team-alpha
spec:
  template:
    spec:
      containers:
        - name: my-service
          env:
            # Adding an env var that's not in Git - no conflict with Flux
            - name: DEBUG_TRACE_ID
              value: "session-abc123"
```

```bash
# Apply with a custom field manager
kubectl apply --server-side \
  --field-manager=ops-override \
  --force-conflicts=false \
  -f /tmp/my-service-override.yaml

# This will succeed if DEBUG_TRACE_ID is not in the Git manifest
# (i.e., Flux doesn't own this env var key)
```

## Step 4: Force Override of Flux-Owned Fields

When you must override a field that Flux owns, use `--force-conflicts`:

```bash
# Create an override manifest for a specific field
cat > /tmp/resource-override.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: team-alpha
spec:
  template:
    spec:
      containers:
        - name: my-service
          resources:
            limits:
              memory: 2Gi   # Temporarily override Flux's declared value of 256Mi
EOF

# Force-apply, taking ownership from Flux
kubectl apply --server-side \
  --field-manager=ops-emergency-override \
  --force-conflicts=true \
  -f /tmp/resource-override.yaml

echo "WARNING: Flux will reclaim this field on next reconciliation"
echo "Resume reconciliation after this window to restore Git state"
```

When Flux next reconciles, it will detect a conflict on the `resources.limits.memory` field and since it owns it in Git, it will reclaim ownership and reset the value. Use this only with Flux suspended.

## Step 5: Transfer Field Ownership from Flux to Another Manager

To permanently give ownership of a field to another controller (like HPA for replicas):

```bash
# First, remove spec.replicas from the Git manifest
# Then apply the manifest - Flux will no longer own spec.replicas
# HPA can now own it

# Verify field ownership transferred
kubectl get deployment my-service -n team-alpha \
  -o json | jq '.metadata.managedFields[] | select(.manager == "gotk-sync-manager") | .fieldsV1."f:spec"."f:replicas"'
# Should return null after Flux reconciles without spec.replicas in Git
```

## Step 6: Inspect and Clean Up Field Managers

```bash
# List all unique field managers on a resource
kubectl get deployment my-service -n team-alpha \
  -o json | jq '[.metadata.managedFields[].manager] | unique'

# Remove orphaned field manager entries (from old tools that no longer exist)
kubectl patch deployment my-service -n team-alpha \
  --type=json \
  -p='[{"op": "remove", "path": "/metadata/managedFields/0"}]'
# Note: Kubernetes automatically cleans up empty managedFields entries

# Reset all field managers by using kubectl apply (client-side)
kubectl apply -f deploy/deployment.yaml
# This switches to client-side apply - use carefully
```

## Step 7: Use Flux's ssa: merge for Controlled Override Behavior

Flux's `kustomize.toolkit.fluxcd.io/ssa` annotation controls how Flux applies resources:

```yaml
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: team-alpha
  annotations:
    # Options: Merge (use SSA merge strategy), IfNotPresent (create only), Ignore (skip)
    kustomize.toolkit.fluxcd.io/ssa: Merge
spec:
  # ...
```

- `Merge` (default): Flux uses server-side apply, owns all declared fields
- `IfNotPresent`: Flux creates the resource but never updates it - manual changes persist
- `Ignore`: Flux skips this resource entirely - full manual control

## Best Practices

- Use `kubectl get -o json | jq '.metadata.managedFields'` to understand field ownership before making changes
- Apply manual overrides with `--field-manager=descriptive-name` so you can identify them later
- Avoid using `--force-conflicts=true` without suspending Flux first - Flux will reclaim the field on next reconciliation
- Document the intended field manager for each resource in your team runbooks
- The cleanest long-term solution for persistent overrides is always to update the Git manifest
- Periodically audit `managedFields` to identify fields owned by obsolete controllers or tools

## Conclusion

Kubernetes server-side apply field managers are the mechanism underlying both Flux's GitOps enforcement and the ability to make safe manual overrides. By understanding which fields Flux owns and using custom field managers for manual changes, operators can work alongside Flux rather than fighting it. For most override scenarios, suspending Flux, making the change, and immediately filing a Git PR is the safest and most auditable workflow. Field manager-based overrides are powerful but best reserved for cases where the field is genuinely not managed by Flux.
