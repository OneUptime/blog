# How to Install Flux CD on K3s Lightweight Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, k3s, Lightweight Kubernetes, DevOps

Description: A step-by-step guide to installing and bootstrapping Flux CD on a K3s lightweight Kubernetes cluster for GitOps-driven deployments.

---

K3s is a lightweight, certified Kubernetes distribution built for edge computing, IoT, and resource-constrained environments. Despite its small footprint, K3s is fully compatible with standard Kubernetes tooling, making it an excellent platform for running Flux CD. In this guide, you will learn how to install Flux CD on a K3s cluster and bootstrap it with a Git repository.

## Prerequisites

Before you begin, make sure you have the following:

- A Linux machine (bare metal or VM) with at least 1 CPU and 512 MB of RAM
- A GitHub personal access token with `repo` permissions
- `kubectl` installed on your local machine
- Internet access for pulling images and connecting to GitHub

## Step 1: Install K3s

K3s can be installed with a single command. This script downloads and installs K3s as a systemd service.

```bash
# Install K3s with the official install script
curl -sfL https://get.k3s.io | sh -
```

After installation, verify that K3s is running.

```bash
# Check that the K3s service is active
sudo systemctl status k3s

# Verify the node is ready
sudo k3s kubectl get nodes
```

## Step 2: Configure kubectl Access

K3s writes its kubeconfig file to `/etc/rancher/k3s/k3s.yaml`. You need to make this accessible for your user and for the Flux CLI.

```bash
# Copy the K3s kubeconfig to the default location
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Verify kubectl works
kubectl get nodes
```

You should see your K3s node listed with a `Ready` status.

## Step 3: Install the Flux CLI

The Flux CLI is required for bootstrapping Flux CD onto your cluster. Install it using the official install script.

```bash
# Install the Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash
```

Verify the installation.

```bash
# Check the Flux CLI version
flux --version
```

## Step 4: Run Pre-Flight Checks

Before bootstrapping, run the `flux check --pre` command to verify that your K3s cluster meets all the requirements for Flux CD.

```bash
# Run Flux pre-flight checks against your K3s cluster
flux check --pre
```

This command checks for Kubernetes version compatibility, cluster connectivity, and required API resources. You should see output indicating all checks have passed. K3s ships with Traefik and CoreDNS by default, so networking requirements are typically met out of the box.

## Step 5: Export Your GitHub Credentials

Flux bootstrap requires a GitHub personal access token to create and manage the GitOps repository.

```bash
# Export your GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>
```

## Step 6: Bootstrap Flux CD

Now bootstrap Flux CD onto your K3s cluster. This command installs the Flux controllers and connects them to your Git repository.

```bash
# Bootstrap Flux CD with a GitHub repository
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/k3s-cluster \
  --personal
```

This command does the following:

1. Creates the `fleet-infra` repository on GitHub if it does not already exist
2. Generates Flux component manifests and pushes them to the repository
3. Installs the Flux controllers in the `flux-system` namespace
4. Configures the controllers to sync from the specified path in the repository

## Step 7: Verify the Installation

After bootstrapping, verify that all Flux components are running.

```bash
# Check that all Flux pods are running
kubectl get pods -n flux-system
```

You should see pods for `source-controller`, `kustomize-controller`, `helm-controller`, and `notification-controller`, all in a `Running` state.

Run the full Flux check to confirm everything is healthy.

```bash
# Run a comprehensive Flux health check
flux check
```

## Step 8: Deploy a Sample Application

To confirm that your GitOps pipeline is working, create a simple Kustomization that deploys an application from a public repository.

Create the following file in your `fleet-infra` repository under `clusters/k3s-cluster/`.

```yaml
# podinfo-source.yaml
# Defines a Git source pointing to the podinfo sample application
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/stefanprodan/podinfo
  ref:
    branch: master
```

```yaml
# podinfo-kustomization.yaml
# Tells Flux to apply the kustomize directory from the podinfo repo
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: default
  sourceRef:
    kind: GitRepository
    name: podinfo
  path: ./kustomize
  prune: true
  timeout: 2m
```

Commit and push these files to your `fleet-infra` repository. Flux will automatically detect the changes and deploy podinfo to your K3s cluster.

```bash
# Watch Flux reconcile the new resources
flux get kustomizations --watch
```

## K3s-Specific Considerations

There are a few things to keep in mind when running Flux CD on K3s:

- **Resource limits**: K3s clusters often run on constrained hardware. Monitor memory usage of Flux controllers, especially if you have many Git repositories or Helm releases to reconcile.
- **Embedded etcd**: If you are using K3s with its embedded SQLite datastore (the default for single-node), be aware that this is not suitable for production HA setups. For production, use K3s with an external database or embedded etcd with multiple server nodes.
- **Traefik ingress**: K3s includes Traefik as its default ingress controller. You can use Flux to manage Traefik configuration through HelmRelease resources or replace it entirely via GitOps.
- **SELinux**: If your host has SELinux enabled, install K3s with the `--selinux` flag to ensure proper labeling of container files.

## Uninstalling Flux CD

If you need to remove Flux CD from your K3s cluster, use the uninstall command.

```bash
# Remove all Flux components from the cluster
flux uninstall --silent
```

This removes all Flux controllers, custom resource definitions, and the `flux-system` namespace. Your deployed workloads will remain untouched, but they will no longer be managed by GitOps.

## Conclusion

K3s provides a lightweight yet fully functional Kubernetes environment that pairs well with Flux CD for GitOps workflows. The combination is particularly effective for edge deployments, home labs, and development environments where resource efficiency matters. With Flux CD installed, you can manage your K3s cluster entirely through Git, gaining version control, audit trails, and automated reconciliation for all your Kubernetes resources.
