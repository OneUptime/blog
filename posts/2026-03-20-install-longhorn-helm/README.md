# How to Install Longhorn with Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Helm, Storage, Installation

Description: A step-by-step guide to installing Longhorn distributed storage on Kubernetes using the Helm package manager.

## Introduction

Helm is one of the most popular ways to install Longhorn on Kubernetes. Helm charts provide a templated, configurable approach to deployment that allows you to customize the installation using values files. This guide covers the complete Helm-based installation process for Longhorn.

## Prerequisites

- Kubernetes cluster (version 1.21+)
- Helm 3.x installed on your workstation
- `kubectl` configured to connect to your cluster
- `open-iscsi` installed and the `iscsid` daemon running on all nodes
- `jq` installed locally if you plan to run the environment check script
- Storage-capable nodes with sufficient disk space; dedicated SSD/NVMe storage is recommended for production
- If your cluster is earlier than Kubernetes v1.25 and still uses Pod Security Policy admission, install Longhorn with `--set enablePSP=true`

### Verify Helm is Installed

```bash
# Check your Helm version

helm version
# Expected output: version.BuildInfo{Version:"v3.x.x", ...}
```

### Check Node Prerequisites

```bash
# Run Longhorn's environment check script (deprecated in v1.7.0 in favor of longhornctl)
curl -sSfL https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/scripts/environment_check.sh | bash
```

## Add the Longhorn Helm Repository

```bash
# Add the official Longhorn Helm chart repository
helm repo add longhorn https://charts.longhorn.io

# Update your local Helm chart index
helm repo update
```

Verify the repository was added:

```bash
# Search for available Longhorn chart versions
helm search repo longhorn/longhorn --versions
```

## Install Longhorn with Default Settings

For a quick installation with default settings:

```bash
# Create the longhorn-system namespace
kubectl create namespace longhorn-system

# Install Longhorn with default values
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --version 1.7.0
```

## Customizing the Installation with a Values File

For production deployments, create a custom `values.yaml` file:

```yaml
# longhorn-values.yaml - Custom configuration for Longhorn installation

# Default Longhorn settings
defaultSettings:
  # Default replica count for volumes created from the Longhorn UI
  defaultReplicaCount: 3
  # Set backup target (e.g., S3 bucket)
  backupTarget: ""
  # Storage over-provisioning percentage
  storageOverProvisioningPercentage: 200
  # Minimum available storage percentage before refusing volume creation
  storageMinimalAvailablePercentage: 25

# Longhorn manager pod scheduling settings
longhornManager:
  priorityClass: "system-node-critical"
  tolerations:
    - key: "node-role.kubernetes.io/master"
      operator: "Exists"
      effect: "NoSchedule"

# Longhorn UI configuration
service:
  ui:
    type: ClusterIP  # Change to LoadBalancer or NodePort as needed
    nodePort: null
  manager:
    type: ClusterIP

# Persistent volume settings
persistence:
  defaultClass: true
  defaultClassReplicaCount: 3
  reclaimPolicy: Delete
  recurringJobSelector:
    enable: false

# Ingress for Longhorn UI (optional)
ingress:
  enabled: false
  # host: longhorn.example.com
```

Apply the custom values:

```bash
# Install Longhorn using the custom values file
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --version 1.7.0 \
  --values longhorn-values.yaml
```

## Verify the Installation

```bash
# Check the status of the Helm release
helm status longhorn -n longhorn-system

# Watch Longhorn pods starting up
kubectl get pods -n longhorn-system -w

# Confirm all pods are running
kubectl get pods -n longhorn-system
```

## Upgrade Longhorn with Helm

When a new version of Longhorn is available:

```bash
# Update the Helm repository
helm repo update

# Upgrade Longhorn to the latest version
helm upgrade longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --values longhorn-values.yaml
```

## View Configured Values

```bash
# List all values currently applied to the release
helm get values longhorn -n longhorn-system --all
```

## Uninstall Longhorn with Helm

```bash
# Allow Longhorn to be uninstalled
kubectl -n longhorn-system patch -p '{"value": "true"}' --type=merge lhs deleting-confirmation-flag

# Uninstall the Longhorn Helm release
helm uninstall longhorn -n longhorn-system

# Remove the namespace (caution: this deletes all resources in it)
kubectl delete namespace longhorn-system
```

> **Warning:** Before uninstalling, delete workloads that use Longhorn volumes. Longhorn does not automatically delete PersistentVolumes, so ensure you have migrated or backed up your data first.

## Accessing the Longhorn UI

After installation, access the UI via port forwarding:

```bash
# Forward the Longhorn UI service to localhost port 8080
kubectl port-forward svc/longhorn-frontend -n longhorn-system 8080:80
```

Open `http://localhost:8080` in your browser.

## Conclusion

Installing Longhorn via Helm gives you a flexible, repeatable, and version-controlled deployment process. Using a custom `values.yaml` file allows your team to maintain consistent configuration across environments. With Longhorn now installed, you can start creating persistent volumes, configuring backup targets, and managing storage policies for your Kubernetes workloads.
