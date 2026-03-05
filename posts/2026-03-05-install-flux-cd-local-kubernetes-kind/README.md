# How to Install Flux CD on a Local Kubernetes Cluster with Kind

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kind, Local Development, CI/CD

Description: A step-by-step guide to installing and configuring Flux CD on a local Kubernetes cluster using Kind (Kubernetes in Docker) for GitOps-based development workflows.

---

Flux CD is one of the most popular GitOps tools for Kubernetes, enabling you to keep your cluster state in sync with configuration stored in Git repositories. If you are looking to experiment with Flux CD or develop GitOps workflows locally before deploying to production, Kind (Kubernetes in Docker) provides an excellent lightweight environment. This guide walks you through the entire process of setting up Flux CD on a Kind cluster.

## Prerequisites

Before you begin, make sure you have the following tools installed on your machine:

- **Docker** - Kind runs Kubernetes nodes as Docker containers
- **Kind** - For creating local Kubernetes clusters
- **kubectl** - The Kubernetes command-line tool
- **Flux CLI** - The command-line interface for Flux CD
- **A GitHub account** - With a personal access token (PAT) that has repo permissions

## Step 1: Install the Flux CLI

The Flux CLI is required to bootstrap and manage Flux CD. Install it using the official install script.

```bash
# Install the Flux CLI on macOS or Linux
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version
```

On macOS, you can also install via Homebrew:

```bash
# Install Flux CLI using Homebrew
brew install fluxcd/tap/flux
```

## Step 2: Create a Kind Cluster

Kind lets you run Kubernetes clusters inside Docker containers. Create a cluster with a custom configuration that exposes ports for potential ingress use.

```yaml
# kind-config.yaml
# Kind cluster configuration with port mappings for local development
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
```

Now create the cluster using this configuration:

```bash
# Create a Kind cluster named 'flux-demo'
kind create cluster --name flux-demo --config kind-config.yaml

# Verify the cluster is running
kubectl cluster-info --context kind-flux-demo

# Confirm you can list nodes
kubectl get nodes
```

You should see a single control-plane node in the Ready state.

## Step 3: Run Flux CD Pre-flight Checks

Before installing Flux CD, run the pre-flight checks to verify that your cluster meets all requirements.

```bash
# Run Flux pre-flight checks against your Kind cluster
flux check --pre

# Expected output should show all checks passed:
# - kubernetes version >= 1.26.0
# - prerequisites checks passed
```

If any checks fail, make sure your Kind cluster is running a supported Kubernetes version. You can specify the Kubernetes version when creating the Kind cluster:

```bash
# Create a Kind cluster with a specific Kubernetes version
kind create cluster --name flux-demo --image kindest/node:v1.30.0
```

## Step 4: Export Your GitHub Token

Flux needs a GitHub personal access token to create and manage the repository that will store your cluster configuration.

```bash
# Export your GitHub personal access token
export GITHUB_TOKEN=<your-github-personal-access-token>

# Export your GitHub username
export GITHUB_USER=<your-github-username>
```

Make sure the token has full `repo` permissions. If you plan to use GitHub Organizations, the token also needs `admin:org` read permissions.

## Step 5: Bootstrap Flux CD on the Kind Cluster

The bootstrap command installs Flux CD components on your cluster and configures them to sync from a Git repository.

```bash
# Bootstrap Flux CD with GitHub
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=flux-demo-kind \
  --branch=main \
  --path=./clusters/kind-flux-demo \
  --personal
```

This command does the following:

1. Creates a GitHub repository called `flux-demo-kind` (if it does not exist)
2. Generates Flux component manifests and pushes them to the repository
3. Installs the Flux controllers on your Kind cluster
4. Configures the controllers to sync from the specified repository path

## Step 6: Verify the Installation

After bootstrapping, verify that all Flux components are running.

```bash
# Check the status of all Flux components
flux check

# List all Flux resources
kubectl get all -n flux-system

# Check that all pods are running
kubectl get pods -n flux-system
```

You should see the following controllers running in the `flux-system` namespace:

- **source-controller** - Manages Git and Helm repository sources
- **kustomize-controller** - Applies Kustomize overlays from Git
- **helm-controller** - Manages Helm chart releases
- **notification-controller** - Handles events and notifications

## Step 7: Deploy a Sample Application

Test your Flux CD installation by creating a simple deployment manifest in your Git repository.

```yaml
# clusters/kind-flux-demo/podinfo/namespace.yaml
# Create a dedicated namespace for the sample app
apiVersion: v1
kind: Namespace
metadata:
  name: podinfo
```

```yaml
# clusters/kind-flux-demo/podinfo/deployment.yaml
# Deploy the podinfo sample application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: podinfo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: podinfo
  template:
    metadata:
      labels:
        app: podinfo
    spec:
      containers:
        - name: podinfo
          image: ghcr.io/stefanprodan/podinfo:6.5.0
          ports:
            - containerPort: 9898
```

Commit and push these files to your repository. Flux will automatically detect the changes and apply them to your cluster.

```bash
# Watch Flux reconcile the changes
flux get kustomizations --watch

# Verify the podinfo deployment
kubectl get pods -n podinfo
```

## Troubleshooting

If Flux is not reconciling as expected, use these commands to diagnose issues:

```bash
# Check Flux logs for errors
flux logs --level=error

# Force a reconciliation
flux reconcile kustomization flux-system --with-source

# Inspect a specific source
flux get sources git
```

## Cleaning Up

When you are finished experimenting, clean up your local environment:

```bash
# Uninstall Flux from the cluster
flux uninstall --silent

# Delete the Kind cluster
kind delete cluster --name flux-demo
```

## Summary

You now have a fully functional Flux CD installation running on a local Kind cluster. This setup is ideal for developing and testing GitOps workflows before rolling them out to staging or production environments. Kind's lightweight nature means you can spin up and tear down clusters quickly, making it a great choice for iterating on Flux CD configurations. From here, you can explore adding Helm releases, setting up image automation, or configuring multi-tenancy with Flux CD.
