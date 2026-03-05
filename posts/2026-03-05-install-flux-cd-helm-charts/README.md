# How to Install Flux CD Using Helm Charts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, Helm Charts, CI/CD, Installation

Description: A complete guide to installing Flux CD using Helm charts instead of the CLI bootstrap process, giving you full control over the deployment configuration.

---

While the `flux bootstrap` command is the recommended way to install Flux CD, there are scenarios where installing via Helm charts is preferable. Helm-based installation gives you fine-grained control over component configuration, integrates with existing Helm-based infrastructure management workflows, and works well in air-gapped environments. This guide covers installing Flux CD using the official Helm chart, configuring individual components, and connecting the installation to a Git repository.

## Prerequisites

- A running Kubernetes cluster (v1.26 or later)
- `kubectl` configured to access your cluster
- Helm v3.10 or later installed
- (Optional) Flux CLI for verification and management

## Why Use Helm Instead of Bootstrap?

The Flux CLI bootstrap is idempotent and manages the full lifecycle, but Helm installation is better suited for:

- **Air-gapped environments** where you need to pre-download charts and images
- **Custom resource limits** and pod configurations
- **Integration with existing Helm-based deployment pipelines** (e.g., Terraform, Pulumi, ArgoCD managing Flux)
- **Centralized chart management** through a Helm repository
- **Fine-grained control** over individual controller settings

## Step 1: Add the Flux Helm Repository

Add the official Flux CD Helm repository to your Helm configuration.

```bash
# Add the Flux CD Helm repository
helm repo add fluxcd https://fluxcd-community.github.io/helm-charts

# Update the Helm repository index
helm repo update

# Search for available Flux charts
helm search repo fluxcd
```

The main chart you will use is `fluxcd/flux2`, which installs all Flux controllers as a single release.

## Step 2: Review Default Values

Inspect the chart's default values to understand the available configuration options.

```bash
# Show all configurable values for the Flux chart
helm show values fluxcd/flux2

# Save the values to a file for customization
helm show values fluxcd/flux2 > flux-values.yaml
```

## Step 3: Create a Custom Values File

Customize the Flux installation by creating a values file with your specific requirements.

```yaml
# flux-values.yaml
# Custom Helm values for Flux CD installation

# Install all core controllers
installCRDs: true

# Source Controller - manages Git and Helm repositories
sourceController:
  create: true
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  # Number of concurrent reconciliation operations
  container:
    additionalArgs:
      - --concurrent=4
      - --requeue-dependency=5s

# Kustomize Controller - applies Kustomize overlays
kustomizeController:
  create: true
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  container:
    additionalArgs:
      - --concurrent=4
      - --requeue-dependency=5s

# Helm Controller - manages Helm releases
helmController:
  create: true
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  container:
    additionalArgs:
      - --concurrent=4

# Notification Controller - handles events and alerts
notificationController:
  create: true
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 250m
      memory: 256Mi

# Image Reflector Controller - scans container registries (optional)
imageReflectorController:
  create: false

# Image Automation Controller - automates image updates (optional)
imageAutomationController:
  create: false

# Watch all namespaces for Flux resources
watchAllNamespaces: true

# Network policies
networkPolicy:
  create: true

# Log level for all controllers
logLevel: info

# Prometheus metrics
prometheus:
  podMonitor:
    create: false  # Set to true if you have Prometheus Operator
```

## Step 4: Install Flux CD with Helm

Install the Flux controllers using your custom values.

```bash
# Create the flux-system namespace
kubectl create namespace flux-system

# Install Flux CD using Helm
helm install flux2 fluxcd/flux2 \
  --namespace flux-system \
  --values flux-values.yaml \
  --wait

# Verify the installation
kubectl get pods -n flux-system
```

All controllers should reach the Running state within a minute.

## Step 5: Verify with the Flux CLI

If you have the Flux CLI installed, use it to verify the Helm-based installation.

```bash
# Run health checks
flux check

# The output should confirm all controllers are healthy
```

## Step 6: Connect to a Git Repository

After installing the controllers via Helm, you need to manually create the Git source and Kustomization resources to start syncing.

First, create the Git authentication secret:

```bash
# For SSH authentication
flux create secret git fleet-infra-auth \
  --url=ssh://git@github.com/<your-org>/fleet-infra.git \
  --private-key-file=~/.ssh/id_ed25519 \
  --namespace=flux-system

# For HTTPS authentication
kubectl create secret generic fleet-infra-auth \
  --from-literal=username=<git-username> \
  --from-literal=password=<git-token> \
  -n flux-system
```

Create the GitRepository source:

```yaml
# git-source.yaml
# GitRepository source to sync cluster configuration
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 1m0s
  ref:
    branch: main
  secretRef:
    name: fleet-infra-auth
  url: ssh://git@github.com/<your-org>/fleet-infra.git
```

Create the Kustomization to apply manifests from the repository:

```yaml
# kustomization-sync.yaml
# Kustomization that applies manifests from the Git repository
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./clusters/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  wait: true
  timeout: 5m0s
```

Apply the resources:

```bash
# Apply the GitRepository and Kustomization
kubectl apply -f git-source.yaml
kubectl apply -f kustomization-sync.yaml

# Verify the sync
flux get sources git
flux get kustomizations
```

## Step 7: Upgrade Flux CD with Helm

Upgrading Flux is straightforward with Helm.

```bash
# Update the Helm repository
helm repo update

# Check available versions
helm search repo fluxcd/flux2 --versions

# Upgrade to the latest version
helm upgrade flux2 fluxcd/flux2 \
  --namespace flux-system \
  --values flux-values.yaml \
  --wait

# Verify the upgrade
flux check
kubectl get pods -n flux-system
```

## Step 8: Enable Image Automation (Optional)

Enable the optional image automation controllers for automated container image updates.

```yaml
# flux-values-image-automation.yaml
# Enable image automation controllers
imageReflectorController:
  create: true
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 250m
      memory: 256Mi

imageAutomationController:
  create: true
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 250m
      memory: 256Mi
```

```bash
# Upgrade with image automation enabled
helm upgrade flux2 fluxcd/flux2 \
  --namespace flux-system \
  --values flux-values.yaml \
  --values flux-values-image-automation.yaml \
  --wait
```

## Step 9: Air-Gapped Installation

For air-gapped environments, pull the chart and images ahead of time.

```bash
# Download the Helm chart archive
helm pull fluxcd/flux2 --version <version> --destination ./charts/

# List the container images used by Flux
helm template flux2 ./charts/flux2-<version>.tgz \
  --namespace flux-system | grep "image:" | sort -u

# Push images to your internal registry
# Example for source-controller:
docker pull ghcr.io/fluxcd/source-controller:v1.2.0
docker tag ghcr.io/fluxcd/source-controller:v1.2.0 registry.internal/fluxcd/source-controller:v1.2.0
docker push registry.internal/fluxcd/source-controller:v1.2.0
```

Override the image registry in your values file:

```yaml
# flux-values-airgap.yaml
# Override image registry for air-gapped installation
cli:
  image: registry.internal/fluxcd/flux-cli
sourceController:
  image: registry.internal/fluxcd/source-controller
kustomizeController:
  image: registry.internal/fluxcd/kustomize-controller
helmController:
  image: registry.internal/fluxcd/helm-controller
notificationController:
  image: registry.internal/fluxcd/notification-controller
```

Install from the local chart:

```bash
# Install from the downloaded chart
helm install flux2 ./charts/flux2-<version>.tgz \
  --namespace flux-system \
  --create-namespace \
  --values flux-values.yaml \
  --values flux-values-airgap.yaml \
  --wait
```

## Step 10: Uninstall Flux via Helm

To remove Flux installed via Helm:

```bash
# Uninstall the Helm release
helm uninstall flux2 --namespace flux-system

# Clean up CRDs (Helm does not remove CRDs automatically)
kubectl delete crd -l app.kubernetes.io/part-of=flux

# Remove the namespace
kubectl delete namespace flux-system
```

## Troubleshooting

Common issues with Helm-based Flux installation:

```bash
# Check if CRDs were installed correctly
kubectl get crd | grep fluxcd

# Verify Helm release status
helm list -n flux-system
helm status flux2 -n flux-system

# Check pod logs for startup errors
kubectl logs -n flux-system deploy/source-controller --tail=50
kubectl logs -n flux-system deploy/kustomize-controller --tail=50

# If pods are in CrashLoopBackOff, check resource limits
kubectl describe pod -n flux-system -l app=source-controller

# Helm values not applied - verify with
helm get values flux2 -n flux-system
```

## Summary

Installing Flux CD via Helm charts gives you complete control over the deployment configuration, making it ideal for production environments with specific resource requirements, air-gapped clusters, or organizations that manage all infrastructure through Helm. While the bootstrap CLI command remains the quickest path to a working setup, Helm installation integrates naturally with existing infrastructure-as-code workflows. After the Helm installation, you connect Flux to a Git repository by creating GitRepository and Kustomization resources, achieving the same GitOps functionality as a bootstrapped installation.
