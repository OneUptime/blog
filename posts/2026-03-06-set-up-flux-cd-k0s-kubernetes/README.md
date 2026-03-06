# How to Set Up Flux CD on k0s Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, k0s, kubernetes, gitops, continuous delivery, lightweight kubernetes

Description: A practical guide to installing and configuring Flux CD on k0s, the lightweight Kubernetes distribution by Mirantis.

---

## Introduction

k0s is a lightweight, CNCF-certified Kubernetes distribution created by Mirantis. It packages everything needed to run Kubernetes into a single binary, making it ideal for edge computing, IoT, and resource-constrained environments. Combining k0s with Flux CD gives you a GitOps-driven workflow on a minimal Kubernetes platform.

This guide walks you through installing k0s, bootstrapping Flux CD, and deploying your first application using GitOps principles.

## Prerequisites

Before you begin, make sure you have the following:

- A Linux machine (Ubuntu 22.04 or later recommended) with at least 2 CPU cores and 2 GB RAM
- Root or sudo access on the machine
- A GitHub account and a personal access token with repo permissions
- `kubectl` installed on your local machine
- `flux` CLI installed on your local machine

## Installing the Flux CLI

Install the Flux CLI on your workstation:

```bash
# Install the latest Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version
```

## Installing k0s

k0s can be installed with a single command. SSH into your target machine and run:

```bash
# Download and install k0s
curl -sSLf https://get.k0s.sh | sudo sh

# Verify the installation
k0s version
```

## Creating a k0s Cluster

Create a single-node k0s cluster with the controller and worker roles combined:

```bash
# Install k0s as a controller with worker capabilities
sudo k0s install controller --single

# Start the k0s service
sudo k0s start

# Check the service status
sudo k0s status
```

Wait a minute or two for all components to initialize, then verify the cluster is running:

```bash
# Check node status using the built-in kubectl
sudo k0s kubectl get nodes

# Check that system pods are running
sudo k0s kubectl get pods -n kube-system
```

## Configuring kubectl Access

Export the kubeconfig so you can use your local `kubectl` and `flux` CLI:

```bash
# Export kubeconfig from k0s
sudo k0s kubeconfig admin > ~/.kube/k0s-config

# Set the KUBECONFIG environment variable
export KUBECONFIG=~/.kube/k0s-config

# Verify access
kubectl get nodes
```

You should see your node listed with a `Ready` status.

## Running Flux CD Pre-flight Checks

Before bootstrapping Flux, run the pre-flight checks to confirm your k0s cluster meets the requirements:

```bash
# Run Flux pre-flight checks
flux check --pre
```

This command verifies that your cluster has the required Kubernetes version and that the necessary APIs are available. k0s ships with all required components, so this check should pass without issues.

## Bootstrapping Flux CD on k0s

Set your GitHub credentials as environment variables:

```bash
# Export your GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>
```

Bootstrap Flux CD with your GitHub repository:

```bash
# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=k0s-fleet \
  --branch=main \
  --path=./clusters/k0s-cluster \
  --personal
```

This command does the following:

- Creates the `k0s-fleet` repository on GitHub if it does not exist
- Generates Flux component manifests and pushes them to the repository
- Installs the Flux controllers on your k0s cluster
- Configures Flux to sync from the specified path in the repository

## Verifying the Flux Installation

Check that all Flux components are running:

```bash
# Verify Flux components
flux check

# List all Flux controllers
kubectl get pods -n flux-system
```

You should see the following controllers running:

- `source-controller`
- `kustomize-controller`
- `helm-controller`
- `notification-controller`

## Creating a GitOps Repository Structure

Set up a clean directory structure in your Git repository:

```bash
# Clone the repository
git clone https://github.com/$GITHUB_USER/k0s-fleet.git
cd k0s-fleet

# Create directory structure for applications
mkdir -p clusters/k0s-cluster/apps
mkdir -p apps/base
mkdir -p apps/overlays/k0s
```

## Deploying an Application with Flux CD

Create a sample nginx deployment managed by Flux. First, define the base application:

```yaml
# apps/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo
```

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: demo
  labels:
    app: nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          # Use a lightweight image suitable for k0s
          image: nginx:alpine
          ports:
            - containerPort: 80
          resources:
            # Keep resource requests low for k0s environments
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

```yaml
# apps/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: demo
spec:
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

```yaml
# apps/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
```

Now create a Flux Kustomization resource to tell Flux to deploy this application:

```yaml
# clusters/k0s-cluster/apps/demo-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: demo-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/base
  prune: true
  # Automatically reconcile every 5 minutes
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: demo
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx
      namespace: demo
  timeout: 2m
```

Commit and push these files:

```bash
git add -A
git commit -m "Add demo nginx application"
git push origin main
```

## Monitoring Reconciliation

Watch Flux reconcile the changes:

```bash
# Watch the Kustomization reconciliation
flux get kustomizations --watch

# Check the application deployment status
kubectl get pods -n demo

# View Flux events
flux events
```

## Deploying Helm Charts with Flux on k0s

Flux can also manage Helm chart deployments. Here is an example that deploys a monitoring stack:

```yaml
# clusters/k0s-cluster/apps/monitoring-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 1h
  url: https://prometheus-community.github.io/helm-charts
```

```yaml
# clusters/k0s-cluster/apps/monitoring-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: ">=55.0.0"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  targetNamespace: monitoring
  install:
    createNamespace: true
  values:
    # Tune resource usage for k0s lightweight environments
    prometheus:
      prometheusSpec:
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        retention: 6h
    grafana:
      resources:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi
```

## Configuring Notifications

Set up Flux notifications to receive alerts when deployments fail or succeed:

```yaml
# clusters/k0s-cluster/apps/notification-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github-status
  namespace: flux-system
spec:
  type: github
  address: https://github.com/<your-github-user>/k0s-fleet
  secretRef:
    name: github-token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: k0s-alerts
  namespace: flux-system
spec:
  providerRef:
    name: github-status
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## k0s-Specific Considerations

When running Flux CD on k0s, keep these points in mind:

### Storage

k0s does not include a default StorageClass. If your Flux-managed workloads need persistent storage, install a CSI driver:

```yaml
# clusters/k0s-cluster/apps/local-path-provisioner.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: local-path
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.containeroo.ch
---
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: local-path-provisioner
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: local-path-provisioner
      sourceRef:
        kind: HelmRepository
        name: local-path
        namespace: flux-system
  targetNamespace: local-path-storage
  install:
    createNamespace: true
```

### Resource Limits

k0s environments are often resource-constrained. Always set resource requests and limits in your Flux-managed workloads to prevent resource contention.

### Multi-Node Clusters

For multi-node k0s clusters, use `k0sctl` for automated setup:

```yaml
# k0sctl.yaml - Multi-node k0s cluster configuration
apiVersion: k0sctl.k0sproject.io/v1beta1
kind: Cluster
metadata:
  name: k0s-flux-cluster
spec:
  hosts:
    - role: controller
      ssh:
        address: 10.0.0.10
        user: root
    - role: worker
      ssh:
        address: 10.0.0.11
        user: root
    - role: worker
      ssh:
        address: 10.0.0.12
        user: root
  k0s:
    version: "1.30.0+k0s.0"
```

## Troubleshooting

Common issues and their resolutions:

```bash
# Check Flux controller logs
kubectl logs -n flux-system deploy/source-controller
kubectl logs -n flux-system deploy/kustomize-controller

# Force a reconciliation
flux reconcile kustomization flux-system --with-source

# Suspend and resume a Kustomization
flux suspend kustomization demo-app
flux resume kustomization demo-app

# Check k0s-specific logs
sudo k0s logs
```

## Conclusion

You now have Flux CD running on a k0s Kubernetes cluster. This combination provides a lightweight, GitOps-driven platform suitable for edge deployments, development environments, and resource-constrained infrastructure. Every change pushed to your Git repository is automatically reconciled by Flux, ensuring your cluster state always matches your desired configuration.
