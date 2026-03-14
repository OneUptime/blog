# How to Upgrade Calico with Helm Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, Helm, CNI

Description: Safely upgrade Calico to a newer version using Helm and the Tigera Operator upgrade process.

---

## Introduction

Managing Calico through Helm provides several advantages for safe upgrades: version pinning, rollback capability, and diff preview before applying changes. When combined with GitOps workflows using Flux or ArgoCD, Helm-managed Calico upgrades become reviewable, auditable, and reversible through standard Git operations.

A Helm-based Calico upgrade is safer than direct manifest application because Helm tracks the current release state and can perform atomic upgrades with automatic rollback on failure. The `helm diff` plugin also allows you to preview exactly what will change before applying, reducing the risk of unexpected configuration drift.

This guide covers the safe Helm upgrade process for Calico, from version planning through execution and validation, with specific guidance for GitOps-managed installations.

## Prerequisites

- Calico installed via Helm (Tigera Operator chart)
- Helm v3.x with `helm-diff` plugin installed
- `kubectl` with cluster-admin access
- `calicoctl` configured
- Git repository with Helm values (for GitOps deployments)

## Step 1: Pre-Upgrade Validation

Validate the current Helm release and cluster state.

```bash
# Check current Calico Helm release
helm list -n tigera-operator

# View the current release values
helm get values calico -n tigera-operator

# Check current Calico version
helm get metadata calico -n tigera-operator

# Verify all Calico pods are healthy
kubectl get pods -n calico-system
kubectl get tigerastatus calico
```

## Step 2: Review the Upgrade with helm diff

Preview changes before applying the upgrade.

```bash
# Install the helm-diff plugin if not present
helm plugin install https://github.com/databus23/helm-diff

# Add/update the Calico Helm repository
helm repo add projectcalico https://docs.tigera.io/calico/charts
helm repo update

# Preview what will change in the upgrade (without applying)
helm diff upgrade calico projectcalico/tigera-operator \
  --namespace tigera-operator \
  --version v3.28.0 \
  --values calico-production-values.yaml
```

## Step 3: Backup Current Helm Values and Calico Configuration

Create a complete backup before the upgrade.

```bash
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

# Export current Helm values to backup file
helm get values calico -n tigera-operator --all \
  > helm-calico-values-backup-$BACKUP_DATE.yaml

# Export Calico custom resources
calicoctl get felixconfiguration -o yaml > calico-felix-backup-$BACKUP_DATE.yaml
calicoctl get ippools -o yaml > calico-ippools-backup-$BACKUP_DATE.yaml
calicoctl get globalnetworkpolicies -o yaml > calico-gnp-backup-$BACKUP_DATE.yaml

echo "Backup complete: helm-calico-values-backup-$BACKUP_DATE.yaml"
```

## Step 4: Execute the Helm Upgrade

Perform the upgrade with atomic flag for automatic rollback on failure.

```bash
# Execute the upgrade with atomic flag (auto-rollback on failure)
helm upgrade calico projectcalico/tigera-operator \
  --namespace tigera-operator \
  --version v3.28.0 \
  --values calico-production-values.yaml \
  --atomic \
  --timeout 10m \
  --cleanup-on-fail

# Monitor the rolling upgrade
kubectl rollout status daemonset/calico-node -n calico-system --timeout=10m

# Watch calico-system pods
kubectl get pods -n calico-system -w
```

For GitOps deployments, update the Helm values file in Git:

```yaml
# Update version in HelmRelease manifest for Flux GitOps
# flux-calico-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: calico
  namespace: tigera-operator
spec:
  interval: 10m
  chart:
    spec:
      chart: tigera-operator
      # Update version here and commit to Git
      version: "v3.28.0"
      sourceRef:
        kind: HelmRepository
        name: projectcalico
        namespace: flux-system
```

## Step 5: Post-Upgrade Validation

Verify the upgrade was successful.

```bash
# Verify Helm release shows new version
helm list -n tigera-operator

# Check TigeraStatus
kubectl get tigerastatus calico

# Verify Calico pods are running new version
kubectl get pods -n calico-system \
  -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[0].image}{"\n"}{end}'

# Test pod connectivity
kubectl run helm-upgrade-test --image=busybox --rm -it --restart=Never -- \
  ping -c 3 8.8.8.8

# If issues arise, rollback with Helm
# helm rollback calico -n tigera-operator
```

## Best Practices

- Always run `helm diff` before every upgrade to review changes
- Use `--atomic` flag to enable automatic rollback on failed upgrades
- Store Helm values files in Git and require PR reviews for all changes
- Tag each successful Helm upgrade in Git with the Calico version deployed
- Keep at least 3 Helm release history entries for rollback: `helm history calico -n tigera-operator`

## Conclusion

Helm provides a structured, reversible approach to Calico upgrades. By using `helm diff` to preview changes, `--atomic` for automatic rollback, and GitOps for change management, you create a safe upgrade path that meets production reliability standards. The combination of Helm's rollback capability and Calico's own rolling upgrade mechanism provides multiple safety layers that protect production workloads during network infrastructure changes.
