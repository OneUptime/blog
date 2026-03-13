# How to Reset Flux Reconciliation State After Disaster Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, DisasterRecovery, Bootstrap

Description: Complete guide to resetting Flux reconciliation state from scratch after a disaster recovery scenario, including full re-bootstrap, inventory reset, and state verification procedures.

---

After a major disaster recovery event, whether it is a full cluster rebuild, a failed migration, or a catastrophic failure, Flux may be in an inconsistent state that cannot be fixed incrementally. In these cases, the best approach is a clean reset of Flux's reconciliation state. This post provides a complete procedure for resetting Flux and re-establishing GitOps control over your cluster.

## Symptoms

After a disaster recovery event, you may encounter a combination of issues:

```bash
flux check
```

```text
> prerequisites
> controllers
x kustomize-controller: deployment not ready
x helm-controller: deployment not ready
x source-controller: deployment not ready
```

Or controllers are running but every Kustomization is failing:

```bash
flux get kustomizations -A
```

All resources show errors, stale inventories, wrong revisions, or conflict errors. Individual fixes are not enough because the state is too corrupted.

## Diagnostic Commands

### Check overall Flux health

```bash
flux check
```

### Assess the scope of the damage

```bash
flux get all -A
```

### Check if Flux CRDs still exist

```bash
kubectl get crds | grep fluxcd
```

### Verify the flux-system namespace

```bash
kubectl get all -n flux-system
```

### Check if the Git source is accessible

```bash
flux get sources git -A
```

## When to Do a Full Reset

A full reset is warranted when:
- More than half of your Kustomizations are in a failed state
- Flux controllers are crashlooping and cannot be fixed by restart
- The Flux CRDs or controllers were partially deleted
- You migrated to a new cluster and want a clean Flux installation
- The etcd state is so corrupted that individual resource fixes are impractical

## Full Reset Procedure

### Step 1: Document the current state

Before resetting, capture what exists so you can verify recovery:

```bash
# Save the list of all Flux resources
flux get all -A > flux-state-before-reset.txt

# Save the current cluster resources
kubectl get all --all-namespaces > cluster-state-before-reset.txt

# Save Flux component versions
flux version > flux-version-before-reset.txt
```

### Step 2: Suspend all Kustomizations

Prevent Flux from making any changes while you reset:

```bash
flux suspend kustomization --all -n flux-system 2>/dev/null || true
flux suspend helmrelease --all -A 2>/dev/null || true
```

### Step 3: Option A - Soft reset (preserve cluster resources)

If your workloads are running fine and you only need to reset Flux state:

```bash
# Remove all Kustomization status (including inventories)
for ks in $(kubectl get kustomizations -n flux-system -o jsonpath='{.items[*].metadata.name}' 2>/dev/null); do
  kubectl patch kustomization $ks -n flux-system --type=json \
    -p='[{"op":"remove","path":"/status"}]' 2>/dev/null || true
done

# Remove all HelmRelease status
for hr in $(kubectl get helmreleases -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} {end}' 2>/dev/null); do
  ns=$(echo $hr | cut -d/ -f1)
  name=$(echo $hr | cut -d/ -f2)
  kubectl patch helmrelease $name -n $ns --type=json \
    -p='[{"op":"remove","path":"/status"}]' 2>/dev/null || true
done

# Restart all controllers
kubectl rollout restart -n flux-system deployment --all
kubectl wait --for=condition=available -n flux-system deployment --all --timeout=300s

# Force reconcile everything
flux reconcile source git --all
sleep 10
flux reconcile kustomization --all --with-source
```

### Step 3: Option B - Hard reset (full re-bootstrap)

If Flux itself is broken, do a complete re-bootstrap:

```bash
# Uninstall Flux (this removes controllers and CRDs but NOT your workloads)
flux uninstall --keep-namespace

# Verify Flux components are removed
kubectl get pods -n flux-system

# Re-bootstrap Flux from your Git repository
flux bootstrap github \
  --owner=your-org \
  --repository=your-fleet-repo \
  --branch=main \
  --path=clusters/production \
  --personal
```

Or if using GitLab:

```bash
flux bootstrap gitlab \
  --owner=your-org \
  --repository=your-fleet-repo \
  --branch=main \
  --path=clusters/production
```

### Step 4: Verify source connectivity

After controllers are running, verify sources are being fetched:

```bash
flux get sources git -A
flux get sources helm -A
```

If sources are not ready, fix authentication:

```bash
flux create secret git my-repo-auth \
  --url=ssh://git@github.com/org/repo \
  --private-key-file=./deploy-key
```

### Step 5: Reconcile in order

Trigger reconciliation starting from the base layer:

```bash
# Start with sources
flux reconcile source git --all

# Then infrastructure
flux reconcile kustomization infra-crds --with-source 2>/dev/null || true
sleep 30
flux reconcile kustomization infra-controllers --with-source 2>/dev/null || true
sleep 30

# Then applications
flux reconcile kustomization apps --with-source 2>/dev/null || true
```

### Step 6: Verify the recovery

Check that all Kustomizations are ready:

```bash
flux get kustomizations -A
```

Compare with the pre-reset state:

```bash
flux get all -A > flux-state-after-reset.txt
diff flux-state-before-reset.txt flux-state-after-reset.txt
```

Verify workloads are running:

```bash
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

### Step 7: Handle prune-related issues

After a reset, Flux's inventory is empty. If `prune: true` is set, Flux will not prune resources it does not know about (since they are not in the inventory). This is safe, but it means orphaned resources may remain.

To clean up orphans after the reset:

```bash
# After Flux has reconciled and rebuilt inventories, check for resources
# not in any Flux inventory
kubectl get all --all-namespaces -l '!kustomize.toolkit.fluxcd.io/name'
```

## Handling Specific Disaster Scenarios

### Cluster rebuilt from scratch

If you provisioned a brand new cluster:

```bash
# Install Flux fresh
flux install

# Apply your Flux configuration from Git
kubectl apply -f clusters/production/flux-system/gotk-sync.yaml
kubectl apply -f clusters/production/flux-system/gotk-components.yaml
```

### Partial controller failure

If only some controllers failed:

```bash
# Reinstall only the failed components
flux install --components=source-controller,kustomize-controller
```

### Corrupted PVC on source controller

If the source controller's storage is corrupted:

```bash
# Delete the PVC and let it be recreated
kubectl delete pvc -n flux-system -l app=source-controller
kubectl rollout restart -n flux-system deployment/source-controller
```

## Prevention Strategies

1. **Maintain a bootstrap script** that can set up Flux from scratch on any cluster:

```bash
#!/bin/bash
# bootstrap.sh
set -e

flux check --pre
flux bootstrap github \
  --owner=$GITHUB_ORG \
  --repository=$FLEET_REPO \
  --branch=main \
  --path=clusters/$CLUSTER_NAME \
  --personal

echo "Waiting for reconciliation..."
flux get kustomizations -A --watch
```

2. **Store Flux configuration in Git** so that re-bootstrapping is always possible from the repository alone.
3. **Practice disaster recovery** regularly. Run the full reset procedure in staging at least quarterly.
4. **Use infrastructure as code** for the cluster itself so you can rebuild the cluster and re-bootstrap Flux programmatically.
5. **Monitor Flux health continuously** with automated checks and alerts:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: flux-system-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: GitRepository
      name: '*'
    - kind: HelmRelease
      name: '*'
```

6. **Document your recovery runbook** and keep it outside the cluster (in a wiki, shared document, or printed copy) so it is accessible when the cluster is down.

The beauty of GitOps is that your desired state is always safely stored in Git. No matter how badly the cluster state is corrupted, you can always rebuild from your Git repository. A well-practiced reset procedure turns a potential disaster into a routine recovery operation.
