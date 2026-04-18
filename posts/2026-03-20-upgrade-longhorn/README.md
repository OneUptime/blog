# How to Upgrade Longhorn

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Upgrade, Maintenance

Description: A complete guide for safely upgrading Longhorn to a new version with pre-upgrade checks, the upgrade process for both Helm and kubectl installations, and post-upgrade validation.

## Introduction

Upgrading Longhorn requires careful planning to avoid data loss or service disruption. Longhorn supports upgrades from any minor version to the next (e.g., 1.5.x → 1.6.x) and from patch versions (e.g., 1.6.0 → 1.6.1). This guide covers the complete upgrade process for both Helm and kubectl-based installations.

## Pre-Upgrade Checklist

Before starting the upgrade:

```bash
# 1. Check current Longhorn version

kubectl get pods -n longhorn-system -l app=longhorn-manager \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# 2. Verify all volumes are healthy before upgrading
kubectl get volumes.longhorn.io -n longhorn-system \
  -o custom-columns="NAME:.metadata.name,STATE:.status.state,ROBUSTNESS:.status.robustness"
# All volumes should show: state=attached/detached, robustness=healthy

# 3. Check all pods are running
kubectl get pods -n longhorn-system

# 4. Review the release notes for the target version
# https://github.com/longhorn/longhorn/releases

# 5. Take backups of critical volumes before upgrading
# Trigger manual backups via UI or recurring jobs

# 6. Note your current settings for reference
kubectl get settings.longhorn.io -n longhorn-system -o yaml > longhorn-settings-backup.yaml
```

## Check for Degraded Volumes

Do not upgrade if any volumes are in a degraded state:

```bash
# Find volumes that are not healthy
kubectl get volumes.longhorn.io -n longhorn-system \
  -o json | \
  jq -r '.items[] | select(.status.robustness != "healthy") | .metadata.name'

# If degraded volumes exist, wait for them to recover before upgrading
kubectl get replicas.longhorn.io -n longhorn-system | grep -v Running
```

## Upgrade Method 1: Using Helm

```bash
# Update the Longhorn Helm repository
helm repo update

# Check available Longhorn versions
helm search repo longhorn --versions | head -10

# Check what values are currently set
helm get values longhorn -n longhorn-system > current-values.yaml

# Preview what will change (dry run)
helm upgrade longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --version 1.7.0 \
  --values current-values.yaml \
  --dry-run

# Perform the upgrade
helm upgrade longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --version 1.7.0 \
  --values current-values.yaml
```

## Upgrade Method 2: Using kubectl

```bash
# Download the new version manifest
curl -sSfL https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/deploy/longhorn.yaml \
  -o longhorn-v1.7.0.yaml

# Apply the new manifest
kubectl apply -f longhorn-v1.7.0.yaml
```

## Monitor the Upgrade

The upgrade process updates components rolling. Monitor it carefully:

```bash
# Watch the pods update
kubectl get pods -n longhorn-system -w

# Monitor the Longhorn manager DaemonSet rollout
kubectl rollout status daemonset/longhorn-manager -n longhorn-system

# Monitor the driver deployer deployment
kubectl rollout status deployment/longhorn-driver-deployer -n longhorn-system

# Monitor the UI deployment
kubectl rollout status deployment/longhorn-ui -n longhorn-system
```

### Understanding the Upgrade Sequence

1. **Longhorn manager** DaemonSet is updated first (rolling restart)
2. **Engine image** DaemonSet is deployed with the new default image
3. **Instance managers** are replaced when volumes are detached
4. **Volume engines** for existing volumes must be upgraded separately (see below)

## Post-Upgrade Validation

```bash
# 1. Verify all pods are running the new version
kubectl get pods -n longhorn-system \
  -o custom-columns="NAME:.metadata.name,IMAGE:.spec.containers[0].image,STATUS:.status.phase"

# 2. Check all volumes are still healthy
kubectl get volumes.longhorn.io -n longhorn-system \
  -o custom-columns="NAME:.metadata.name,STATE:.status.state,ROBUSTNESS:.status.robustness"

# 3. Verify the new Longhorn version
kubectl get settings.longhorn.io -n longhorn-system | head -5

# 4. Run a test to confirm storage operations work
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: post-upgrade-test
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
EOF

kubectl get pvc post-upgrade-test

# 5. Clean up test PVC
kubectl delete pvc post-upgrade-test
```

## Upgrade Engine for Existing Volumes

After upgrading Longhorn, you may need to upgrade the engine for existing volumes:

### Via Longhorn UI

1. Navigate to the **Volume** page
2. Select one or more volumes with an outdated engine image (use batch selection to upgrade multiple at once)
3. Click the **Upgrade Engine** batch operation (or the three-dot menu on a single volume) and choose the new engine image

### Via kubectl

```bash
# List volumes with outdated engines
kubectl get volumes.longhorn.io -n longhorn-system \
  -o json | \
  jq -r '.items[] |
    select(.spec.image != .status.currentImage) |
    .metadata.name'

# The engine upgrade happens automatically when volumes are next detached/attached
# For immediate upgrade, follow the UI process
```

## Handling Upgrade Failures

If the upgrade fails:

```bash
# Check the upgrade error
kubectl describe pods -n longhorn-system | grep -A 5 "Error"

# Check manager logs for errors
kubectl logs -n longhorn-system -l app=longhorn-manager --tail=100

# If Helm upgrade failed, check release status
helm status longhorn -n longhorn-system

# Roll back the Helm release if needed
helm rollback longhorn -n longhorn-system
```

## Conclusion

Upgrading Longhorn is a well-defined process that, when followed carefully, can be done with minimal or no disruption to running workloads. The key to a successful upgrade is verifying cluster health before starting, monitoring the rollout closely, and validating storage operations after completion. Following the official Longhorn release notes for each version ensures you are aware of any breaking changes or special upgrade steps required.
