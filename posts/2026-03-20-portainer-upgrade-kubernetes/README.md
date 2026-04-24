# How to Upgrade Portainer CE on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Upgrade, Kubernetes, Helm, Update

Description: A guide to upgrading Portainer CE deployed on Kubernetes using Helm and kubectl, covering data preservation and rollback procedures.

## Overview

Upgrading Portainer CE on Kubernetes can be done via Helm (if installed with Helm) or by applying the updated Kubernetes manifest that matches the original installation method. This guide covers both methods and best practices for production Kubernetes Portainer upgrades.

## Method 1: Upgrade via Helm

If Portainer was installed with Helm:

```bash
# Check current Portainer Helm release

helm list -n portainer

# Ensure the Portainer Helm repository is configured, then update it
helm repo add portainer https://portainer.github.io/k8s/ --force-update
helm repo update

# Check available chart versions
helm search repo portainer/portainer --versions | head -10

# Upgrade to the current LTS release
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  --reuse-values \
  --set image.tag=lts

# Or upgrade to a specific chart version and Portainer image tag
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  --version <chart-version> \
  --reuse-values \
  --set image.tag=<portainer-version>

# Monitor upgrade
kubectl rollout status deployment/portainer -n portainer
```

## Method 2: Upgrade by Updating Image

For a Portainer Deployment that you manage directly with kubectl:

```bash
# Update image to the current LTS tag
kubectl set image deployment/portainer \
  portainer=portainer/portainer-ce:lts \
  -n portainer

# Or pin to a specific supported version
kubectl set image deployment/portainer \
  portainer=portainer/portainer-ce:<portainer-version> \
  -n portainer

# Monitor rollout
kubectl rollout status deployment/portainer -n portainer
```

## Method 3: Apply Updated Manifest

```bash
# Download the current NodePort manifest
# Use portainer-lb.yaml instead if your original deployment uses a LoadBalancer service
curl -L -o portainer-new.yaml https://downloads.portainer.io/ce-lts/portainer.yaml

# Review changes
diff portainer-current.yaml portainer-new.yaml

# Apply updated manifest
kubectl apply -f portainer-new.yaml

# Monitor upgrade
kubectl rollout status -n portainer deployment/portainer
```

## Backup Before Upgrading

Portainer includes a built-in backup feature. Before upgrading, log in as an administrator, go to **Settings**, scroll to **Back up Portainer**, and download a backup file. This backs up Portainer's configuration from the `/data` volume and is the supported restore path if you need to recover after a failed upgrade.

## Rollback if Upgrade Fails

```bash
# Check rollback history
kubectl rollout history deployment/portainer -n portainer
helm history portainer -n portainer

# Roll back the Kubernetes deployment
kubectl rollout undo deployment/portainer -n portainer

# Or roll back the Helm release
helm rollback portainer <REVISION> -n portainer

```

If the older Portainer version cannot start because the database schema changed during the upgrade, restore the backup you took before upgrading before starting the older version again.

## Upgrade Portainer Agent on Kubernetes

If you deployed the Portainer Agent separately on Kubernetes, keep it on the same stream or version as the Portainer Server:

```bash
# Upgrade agent using kubectl
kubectl set image deployment/portainer-agent \
  portainer-agent=portainer/agent:lts \
  -n portainer

# Or pin to a specific version that matches the Portainer Server version
kubectl set image deployment/portainer-agent \
  portainer-agent=portainer/agent:<portainer-version> \
  -n portainer

# Monitor agent rollout
kubectl rollout status deployment/portainer-agent -n portainer
```

## Verify Upgrade

```bash
# Check all Portainer pods are running
kubectl get pods -n portainer

# Check Portainer version
kubectl exec -n portainer deployment/portainer -- /portainer --version

# Check logs for errors
kubectl logs -n portainer deployment/portainer --tail=50
```

## Conclusion

Upgrading Portainer CE on Kubernetes is straightforward with either Helm or by applying the updated manifest that matches your deployment. The key is to preserve the PersistentVolumeClaim (PVC) that stores Portainer data and to take a backup before upgrading, especially on production clusters. Helm provides a clean upgrade path with built-in release history, while manifest-based deployments should be updated with the current official Portainer YAML for the same exposure method.
