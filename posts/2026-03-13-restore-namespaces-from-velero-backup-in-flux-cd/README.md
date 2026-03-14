# How to Restore Namespaces from Velero Backup in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, Restore, Disaster Recovery, GitOps, Kubernetes, Backup

Description: Restore Kubernetes namespaces from Velero backups in a Flux CD managed cluster, handling the interaction between Velero restores and GitOps reconciliation.

---

## Introduction

Restoring from a Velero backup in a Flux CD managed cluster requires careful coordination. Velero and Flux both manage Kubernetes resources, and a naive restore can conflict with Flux's continuous reconciliation. Understanding the correct restore procedure prevents Flux from immediately overwriting a Velero restore with the GitOps state-or conversely, preventing Velero from restoring resources that Flux manages.

The key principle is: Flux manages the desired state from Git, and Velero restores actual resource state from a point-in-time snapshot. These are complementary, not competing, when used correctly. This guide covers the restore workflow for different scenarios: restoring a deleted namespace, restoring to a new cluster, and restoring specific resources.

## Prerequisites

- Velero deployed with a configured BackupStorageLocation
- Flux CD bootstrapped on the cluster
- A recent Velero backup of the target namespace
- `velero` and `kubectl` CLIs installed

## Step 1: List Available Backups

```bash
# List all available backups
velero backup get

# Filter backups for a specific namespace
velero backup get | grep my-app

# Get details about a specific backup
velero backup describe my-app-backup-20260313020000 --details

# Check what was included in the backup
velero backup describe my-app-backup-20260313020000 \
  --details | grep -A20 "Resource List"
```

## Step 2: Scenario 1 - Restore a Deleted Namespace

If a namespace was accidentally deleted, restore it without conflicting with Flux.

```bash
# Step 1: Pause Flux reconciliation for the affected Kustomization
# This prevents Flux from interfering during the restore
flux suspend kustomization my-app-kustomization

# Step 2: Restore the namespace from the most recent backup
velero restore create my-app-restore-20260313 \
  --from-backup my-app-backup-20260313020000 \
  --include-namespaces my-app \
  --wait

# Step 3: Verify the restore
velero restore describe my-app-restore-20260313
kubectl get all -n my-app

# Step 4: Check application health before resuming Flux
kubectl get pods -n my-app

# Step 5: Resume Flux reconciliation
# Flux will now reconcile the namespace to the desired Git state
# Minor differences between the backup and Git state will be corrected
flux resume kustomization my-app-kustomization

# Step 6: Verify Flux reconciliation completes successfully
flux get kustomization my-app-kustomization
```

## Step 3: Scenario 2 - Restore to a New Cluster

When rebuilding a cluster from scratch, use Velero to restore application data while Flux handles cluster configuration.

```bash
# Step 1: Bootstrap Flux on the new cluster first
# This installs Flux controllers and restores infrastructure manifests from Git
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production

# Step 2: Wait for Flux to install infrastructure (Velero, monitoring, etc.)
flux get kustomizations --watch

# Step 3: Ensure Velero is running and the BSL is available
kubectl get pods -n velero
kubectl get backupstoragelocation -n velero

# Step 4: Suspend application Kustomizations before restore
flux suspend kustomization my-app
flux suspend kustomization my-database

# Step 5: Restore applications from backup
velero restore create cluster-rebuild-restore \
  --from-backup my-full-cluster-backup-20260313020000 \
  --exclude-namespaces kube-system,flux-system,velero \
  --include-cluster-resources=false \
  --wait

# Step 6: Verify restores
kubectl get namespaces
kubectl get pods -A

# Step 7: Resume Flux and let it reconcile
flux resume kustomization my-app
flux resume kustomization my-database
```

## Step 4: Restore Specific Resources

Sometimes you only need to restore specific resources within a namespace.

```bash
# Restore only PersistentVolumeClaims from a backup
velero restore create pvc-restore \
  --from-backup my-app-backup-20260313020000 \
  --include-namespaces my-app \
  --include-resources persistentvolumeclaims,persistentvolumes \
  --wait

# Restore a specific deployment
velero restore create deployment-restore \
  --from-backup my-app-backup-20260313020000 \
  --include-namespaces my-app \
  --include-resources deployments \
  --selector app=my-specific-app \
  --wait
```

## Step 5: Handle Restore Conflicts

When restoring resources that already exist, use the `--existing-resource-policy` flag.

```bash
# Skip existing resources (default behavior)
velero restore create safe-restore \
  --from-backup my-app-backup-20260313020000 \
  --include-namespaces my-app \
  --existing-resource-policy none \
  --wait

# Update existing resources to match backup state
velero restore create update-restore \
  --from-backup my-app-backup-20260313020000 \
  --include-namespaces my-app \
  --existing-resource-policy update \
  --wait
```

## Step 6: Verify and Clean Up

```bash
# Check restore status
velero restore get

# Get restore details
velero restore describe my-app-restore-20260313 --details

# Check for any restore warnings or errors
velero restore logs my-app-restore-20260313

# Verify application is functioning
kubectl exec -n my-app deployment/my-app -- curl localhost:8080/healthz

# Clean up the restore object (optional - keeps logs available while present)
velero restore delete my-app-restore-20260313
```

## Step 7: Create a Restore Runbook as a ConfigMap

Document the restore procedure for on-call engineers.

```yaml
# infrastructure/velero/runbooks/restore-runbook.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: velero-restore-runbook
  namespace: velero
data:
  namespace-restore.md: |
    # Namespace Restore Procedure
    1. flux suspend kustomization <name>
    2. velero restore create <restore-name> --from-backup <backup-name> --include-namespaces <ns>
    3. velero restore describe <restore-name> --details
    4. kubectl get pods -n <ns>  # Verify pods are running
    5. flux resume kustomization <name>
    6. flux get kustomization <name>  # Verify reconciliation succeeds
```

## Best Practices

- Always suspend the relevant Flux Kustomization before performing a Velero restore. This prevents Flux from immediately reconciling over the restored resources.
- Resume Flux after verifying the restore is successful, not before. Flux's reconciliation will bring the restored namespace into alignment with the Git state.
- Test restores regularly in a non-production environment. Run quarterly restore drills using production backups to validate your disaster recovery capability.
- Use `--existing-resource-policy none` (the default) for most restores to avoid accidentally overwriting resources that are functioning correctly.
- Document the restore procedure in a runbook stored in Git. During an incident, on-call engineers need clear, tested steps they can follow without expert knowledge.

## Conclusion

Restoring Velero backups in a Flux-managed cluster requires coordinating between Velero's restore process and Flux's reconciliation loop. By suspending Flux Kustomizations during restore and resuming them afterward, you prevent conflicts and allow Flux to bring the cluster to a consistent desired state after the data restore. The combination of Velero's data recovery and Flux's GitOps reconciliation provides a comprehensive disaster recovery capability.
