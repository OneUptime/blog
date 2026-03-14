# How to Fix Flux Reconciliation After etcd Restore

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, Etcd, Backup, Restore

Description: Recover Flux reconciliation after restoring an etcd backup, handling stale state, resource version conflicts, and inventory mismatches caused by the time gap between backup and restore.

---

Restoring an etcd backup rolls back the entire cluster state to a previous point in time. This creates a significant gap between what Flux thinks the cluster looks like and what actually exists. Resource versions are wrong, inventories are stale, and controllers may be confused. This post covers the full recovery process after an etcd restore.

## Symptoms

After an etcd restore, Flux exhibits various errors:

```bash
flux get kustomizations
```

```text
NAME        REVISION              SUSPENDED   READY   MESSAGE
my-app      main@sha1:old123      False       False   Apply failed: Operation cannot be fulfilled on ... the object has been modified
```

Or resources appear to exist in the Flux inventory but are actually missing, or resources exist in the cluster but Flux does not know about them.

## Diagnostic Commands

### Check Flux controller health

```bash
kubectl get pods -n flux-system
kubectl logs -n flux-system deployment/kustomize-controller --since=30m
```

### Compare the Git revision Flux knows about vs current

```bash
flux get sources git
git log --oneline -5  # On your local repo
```

### Check for resource version conflicts

```bash
kubectl logs -n flux-system deployment/kustomize-controller | grep "conflict\|modified\|resource version"
```

### Verify the Flux inventory against actual cluster state

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.inventory.entries}' | jq -r '.[].id' | while read id; do
  ns=$(echo $id | cut -d_ -f1)
  name=$(echo $id | cut -d_ -f2)
  gvk=$(echo $id | cut -d_ -f3-)
  echo -n "Checking $id: "
  kubectl get $gvk $name -n $ns 2>&1 | head -1
done
```

### Check the etcd restore timestamp

```bash
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | head -20
```

## Common Root Causes

### 1. Stale resource versions

The etcd restore brings back old resource versions. When Flux tries to update resources, it gets optimistic locking conflicts because the resource versions do not match.

### 2. Inventory mismatch

Resources created between the backup time and restore time are missing from the cluster but present in the Flux inventory (or vice versa).

### 3. Source controller artifact lost

The source controller stores artifacts on a PVC. If the PVC was restored to the old state, the latest fetched source may be gone.

### 4. Flux controllers using stale cached state

Flux controllers cache cluster state in memory. After an etcd restore, the cache does not match reality.

### 5. Secrets and ConfigMaps reverted

Credentials, tokens, and configuration that were updated between backup and restore are now reverted to old values.

## Step-by-Step Fixes

### Fix 1: Restart all Flux controllers

The first step is to clear all in-memory caches by restarting every Flux controller:

```bash
kubectl rollout restart -n flux-system deployment/source-controller
kubectl rollout restart -n flux-system deployment/kustomize-controller
kubectl rollout restart -n flux-system deployment/helm-controller
kubectl rollout restart -n flux-system deployment/notification-controller
```

Wait for all controllers to be ready:

```bash
kubectl wait --for=condition=available -n flux-system deployment --all --timeout=120s
```

### Fix 2: Force source reconciliation

The source controller needs to re-fetch the latest source artifacts:

```bash
flux reconcile source git --all
```

Verify the sources are up to date:

```bash
flux get sources git -A
```

### Fix 3: Reset Kustomization inventories

If the inventory is stale, clear it and let Flux rebuild:

```bash
for ks in $(kubectl get kustomizations -n flux-system -o jsonpath='{.items[*].metadata.name}'); do
  echo "Resetting inventory for $ks"
  kubectl patch kustomization $ks -n flux-system --type=json -p='[{"op":"remove","path":"/status/inventory"}]' 2>/dev/null || true
done
```

### Fix 4: Force reconciliation with conflict resolution

Use the force flag to overwrite resource version conflicts:

```bash
for ks in $(kubectl get kustomizations -n flux-system -o jsonpath='{.items[*].metadata.name}'); do
  echo "Force reconciling $ks"
  flux reconcile kustomization $ks --with-source --force 2>/dev/null || true
done
```

Or temporarily enable force on all Kustomizations:

```bash
for ks in $(kubectl get kustomizations -n flux-system -o jsonpath='{.items[*].metadata.name}'); do
  kubectl patch kustomization $ks -n flux-system --type=merge -p '{"spec":{"force":true}}'
done
```

After reconciliation succeeds, disable force:

```bash
for ks in $(kubectl get kustomizations -n flux-system -o jsonpath='{.items[*].metadata.name}'); do
  kubectl patch kustomization $ks -n flux-system --type=merge -p '{"spec":{"force":false}}'
done
```

### Fix 5: Update reverted secrets

Check if any Flux-related secrets were reverted:

```bash
kubectl get secrets -n flux-system
```

Key secrets to verify:
- Git authentication secrets
- Helm repository credentials
- Notification provider tokens
- Image registry credentials

If credentials were rotated between the backup and restore, update them:

```bash
flux create secret git my-repo-auth \
  --url=ssh://git@github.com/org/repo \
  --private-key-file=./current-deploy-key
```

### Fix 6: Reconcile in dependency order

After clearing inventories, reconcile Kustomizations in the correct order:

```bash
# Infrastructure first
flux reconcile kustomization infra-crds --with-source
flux reconcile kustomization infra-controllers --with-source

# Wait for infrastructure to be ready
flux get kustomization infra-controllers

# Then applications
flux reconcile kustomization apps --with-source
```

## Prevention Strategies

1. **Take etcd backups frequently** to minimize the gap between backup state and current state.
2. **Document the Flux recovery procedure** in your disaster recovery runbook.
3. **Store credentials outside etcd** where possible, using external secret managers like HashiCorp Vault or AWS Secrets Manager.
4. **Use Flux's built-in suspend** before planned maintenance:

```bash
flux suspend kustomization --all -n flux-system
# Perform maintenance
flux resume kustomization --all -n flux-system
```

5. **Test the recovery procedure** regularly by performing etcd restore drills in a staging environment.
6. **Monitor Flux health** after any cluster-level operation with automated checks:

```bash
flux check
```

An etcd restore is one of the most disruptive operations for Flux because it invalidates the entire cluster state that Flux relies on. Having a clear recovery runbook and practicing it regularly is essential for any production GitOps setup.
