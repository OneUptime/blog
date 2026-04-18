# How to Upgrade Portainer CE on Kubernetes - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Upgrade, Helm, DevOps

Description: Guide to upgrading Portainer Community Edition on Kubernetes using Helm or kubectl with zero data loss.

---

Portainer on Kubernetes is typically managed via Helm. Upgrading is a standard `helm upgrade` operation. If you deployed manually with kubectl, you update the deployment image directly.

## Prerequisites

- `kubectl` configured for your cluster
- Helm 3 installed (if using Helm deployment)
- Access to the namespace where Portainer is deployed

## Back Up Portainer Data

Before upgrading, snapshot the Portainer PersistentVolumeClaim:

```bash
# Find the Portainer pod name

kubectl get pods -n portainer -l app.kubernetes.io/name=portainer

# Archive the Portainer /data directory inside the pod as a backup
kubectl exec -n portainer deployment/portainer -- \
  tar czf /tmp/portainer_backup.tar.gz /data 2>/dev/null || true

# Copy the backup to your local machine
kubectl cp portainer/<pod-name>:/tmp/portainer_backup.tar.gz ./portainer_backup.tar.gz
```

## Upgrade via Helm

### Step 1: Update the Helm Repository

```bash
# Update the Portainer Helm chart repository to get the latest charts
helm repo update portainer
```

### Step 2: Check Available Versions

```bash
# List available Portainer CE chart versions
helm search repo portainer/portainer --versions | head -10
```

### Step 3: Run the Upgrade

```bash
# Upgrade Portainer CE to the latest chart version
# --reuse-values preserves your existing Helm values
helm upgrade portainer portainer/portainer \
  -n portainer \
  --reuse-values
```

### Step 4: Upgrade to a Specific Version

```bash
# Upgrade to a specific chart version (pinned)
helm upgrade portainer portainer/portainer \
  -n portainer \
  --version 1.0.57 \
  --reuse-values
```

## Upgrade via kubectl

If you deployed without Helm, update the deployment image directly:

```bash
# Update the Portainer deployment to use the latest CE image
kubectl set image deployment/portainer \
  portainer=portainer/portainer-ce:latest \
  -n portainer

# Watch the rollout progress
kubectl rollout status deployment/portainer -n portainer
```

## Monitor the Upgrade

```bash
# Check pod status during upgrade
kubectl get pods -n portainer -w

# View upgrade events
kubectl describe deployment portainer -n portainer | tail -20

# Check rollout history
kubectl rollout history deployment/portainer -n portainer
```

## Rollback if Needed

```bash
# Roll back to the previous version using Helm
helm rollback portainer -n portainer

# Or rollback using kubectl
kubectl rollout undo deployment/portainer -n portainer
```

## Verify Success

```bash
# Confirm the new image is running
kubectl get deployment portainer -n portainer \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Access `https://<node-ip>:<nodeport>` and verify the version in **Settings > About**.

---

*Keep your Kubernetes workloads and Portainer monitored 24/7 with [OneUptime](https://oneuptime.com).*
