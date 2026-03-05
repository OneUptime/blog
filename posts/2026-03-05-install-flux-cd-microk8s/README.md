# How to Install Flux CD on MicroK8s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, MicroK8s, Ubuntu, Snap, DevOps

Description: Learn how to install and configure Flux CD on a MicroK8s cluster for automated GitOps-based Kubernetes deployments.

---

MicroK8s is a lightweight Kubernetes distribution from Canonical, installed via Snap and commonly used for local development, CI/CD pipelines, and edge computing. It provides a zero-ops Kubernetes experience while remaining fully conformant. This guide walks you through installing Flux CD on MicroK8s and setting up a complete GitOps workflow.

## Prerequisites

- Ubuntu 20.04 or later (MicroK8s also works on other Linux distros, macOS, and Windows)
- Snap package manager installed
- A GitHub personal access token with `repo` permissions
- At least 2 CPU cores and 2 GB of RAM

## Step 1: Install MicroK8s

Install MicroK8s using Snap.

```bash
# Install MicroK8s from the stable channel
sudo snap install microk8s --classic --channel=1.28/stable

# Add your user to the microk8s group to avoid using sudo
sudo usermod -a -G microk8s $USER
sudo chown -R $USER ~/.kube

# Apply group membership (or log out and back in)
newgrp microk8s
```

Wait for MicroK8s to be ready.

```bash
# Wait for MicroK8s to finish initializing
microk8s status --wait-ready
```

## Step 2: Enable Required Add-ons

MicroK8s uses an add-on system for optional components. Flux CD requires DNS and storage at a minimum. Enable the essentials.

```bash
# Enable DNS for service discovery (required by Flux)
microk8s enable dns

# Enable storage for persistent volume claims
microk8s enable storage

# Enable Helm 3 support (useful for Flux HelmRelease resources)
microk8s enable helm3
```

## Step 3: Configure kubectl Access

MicroK8s ships with its own `kubectl` as `microk8s kubectl`. For compatibility with the Flux CLI, export the kubeconfig so the standard `kubectl` can access the cluster.

```bash
# Export MicroK8s kubeconfig to the standard location
mkdir -p ~/.kube
microk8s config > ~/.kube/config

# Verify access with standard kubectl
kubectl get nodes
```

You should see a single node with `Ready` status.

## Step 4: Install the Flux CLI

Install the Flux CLI using the official install script.

```bash
# Install the Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version
```

## Step 5: Run Pre-Flight Checks

Validate that your MicroK8s cluster meets Flux CD requirements.

```bash
# Run pre-flight checks
flux check --pre
```

All checks should pass. If DNS is not yet fully operational, wait a minute and retry. MicroK8s DNS sometimes takes a moment to stabilize after being enabled.

## Step 6: Export GitHub Credentials

Set your GitHub token and username as environment variables.

```bash
# Set GitHub credentials for Flux bootstrap
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>
```

## Step 7: Bootstrap Flux CD

Bootstrap Flux CD onto your MicroK8s cluster.

```bash
# Bootstrap Flux CD with GitHub
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/microk8s-cluster \
  --personal
```

The bootstrap process will:

1. Create the `fleet-infra` GitHub repository if it does not exist
2. Push the Flux component manifests to the repository
3. Install the Flux controllers in the `flux-system` namespace
4. Set up a `GitRepository` and `Kustomization` resource to keep the cluster in sync

## Step 8: Verify the Installation

Check that all Flux components are deployed and healthy.

```bash
# List all pods in the flux-system namespace
kubectl get pods -n flux-system

# Run the full Flux health check
flux check
```

Expected output shows all controllers running and all health checks passing.

## Step 9: Test the GitOps Pipeline

Create a sample application deployment managed by Flux. Add the following files to your `fleet-infra` repository under `clusters/microk8s-cluster/`.

```yaml
# nginx-source.yaml
# Define a HelmRepository source for the Bitnami chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.bitnami.com/bitnami
```

```yaml
# nginx-release.yaml
# Deploy nginx using a HelmRelease managed by Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: default
spec:
  interval: 15m
  chart:
    spec:
      chart: nginx
      version: "15.*"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 10m
  values:
    replicaCount: 1
    service:
      type: ClusterIP
```

Commit and push these files, then watch Flux reconcile.

```bash
# Watch Flux reconcile the Helm release
flux get helmreleases --watch
```

## MicroK8s-Specific Considerations

When running Flux CD on MicroK8s, keep the following in mind:

- **Snap confinement**: MicroK8s runs within Snap confinement, which means file paths and permissions may behave differently from standard Kubernetes installations. The kubeconfig export step above addresses the most common issue.
- **Add-on dependencies**: Always enable the `dns` add-on before bootstrapping Flux. Without it, pods cannot resolve service names and Flux controllers will fail to start properly.
- **Multi-node clusters**: MicroK8s supports clustering with `microk8s add-node`. Flux CD works seamlessly across multi-node MicroK8s clusters without additional configuration.
- **Registry add-on**: If you want to use a local container registry with Flux, enable it with `microk8s enable registry`. You can then configure Flux image automation to work with the local registry at `localhost:32000`.
- **Resource usage**: MicroK8s with Flux CD running all four controllers typically consumes around 500-700 MB of RAM. On constrained systems, consider disabling controllers you do not need using custom bootstrap components.

## Upgrading Flux CD on MicroK8s

To upgrade Flux CD to a newer version, update the Flux CLI and re-run the bootstrap command.

```bash
# Update the Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Re-run bootstrap to upgrade Flux components in the cluster
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/microk8s-cluster \
  --personal
```

The bootstrap command is idempotent. It will update the Flux component manifests in your repository and reconcile the controllers to the new version.

## Uninstalling Flux CD

To remove Flux from your MicroK8s cluster, run the following.

```bash
# Uninstall all Flux components
flux uninstall --silent
```

## Conclusion

MicroK8s and Flux CD make a powerful combination for development and edge environments. MicroK8s provides a minimal, easy-to-manage Kubernetes distribution, while Flux CD brings automated GitOps workflows that keep your cluster state in sync with your Git repository. Together, they give you a production-like Kubernetes experience with minimal overhead.
