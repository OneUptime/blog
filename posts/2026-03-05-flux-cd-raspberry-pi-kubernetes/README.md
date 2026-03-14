# How to Set Up Flux CD on a Raspberry Pi Kubernetes Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Raspberry Pi, ARM64, K3s, Edge Computing

Description: A complete guide to installing and running Flux CD on a Raspberry Pi Kubernetes cluster using K3s, with ARM64-specific considerations and resource optimizations.

---

Running Kubernetes on Raspberry Pi hardware is popular for home labs, edge computing, and learning environments. Flux CD fully supports ARM64 architecture, making it a great choice for GitOps on Raspberry Pi clusters. This guide walks through setting up a Raspberry Pi Kubernetes cluster with K3s and deploying Flux CD with resource-optimized configurations suitable for the Pi's limited hardware.

## Prerequisites

- One or more Raspberry Pi 4 or 5 boards (4GB RAM minimum recommended)
- MicroSD cards or USB SSDs with a Linux OS installed (Raspberry Pi OS 64-bit or Ubuntu 22.04 ARM64)
- Network connectivity between the Pi nodes
- A GitHub or GitLab account for Flux bootstrap
- A workstation with `kubectl` and the Flux CLI installed

## Step 1: Install K3s on Your Raspberry Pi

K3s is a lightweight Kubernetes distribution ideal for Raspberry Pi. Install it on your primary node.

```bash
# Install K3s on the primary (server) node
curl -sfL https://get.k3s.io | sh -

# Get the node token for joining worker nodes
sudo cat /var/lib/rancher/k3s/server/node-token

# Get the kubeconfig file
sudo cat /etc/rancher/k3s/k3s.yaml
```

For additional worker nodes, join them to the cluster:

```bash
# On each worker Raspberry Pi, join the cluster
# Replace SERVER_IP and NODE_TOKEN with your values
curl -sfL https://get.k3s.io | K3S_URL=https://SERVER_IP:6443 K3S_TOKEN=NODE_TOKEN sh -
```

Copy the kubeconfig to your workstation:

```bash
# On your workstation, copy the kubeconfig
scp pi@SERVER_IP:/etc/rancher/k3s/k3s.yaml ~/.kube/config-pi

# Update the server address in the kubeconfig
sed -i 's/127.0.0.1/SERVER_IP/' ~/.kube/config-pi

# Set the KUBECONFIG environment variable
export KUBECONFIG=~/.kube/config-pi

# Verify connectivity
kubectl get nodes
```

## Step 2: Verify ARM64 Compatibility

Confirm that your cluster is running on ARM64 architecture, which Flux CD supports natively.

```bash
# Check node architecture
kubectl get nodes -o custom-columns=NAME:.metadata.name,ARCH:.status.nodeInfo.architecture,OS:.status.nodeInfo.operatingSystem

# Verify K3s is running
kubectl get pods -A
```

You should see `arm64` in the ARCH column.

## Step 3: Install the Flux CLI

Install the Flux CLI on your workstation. The CLI is available for ARM64 if your workstation is also a Raspberry Pi.

```bash
# Install Flux CLI (works on both AMD64 and ARM64)
curl -s https://fluxcd.io/install.sh | bash

# Verify the installation
flux --version

# Run pre-flight checks against the Pi cluster
flux check --pre
```

The pre-check verifies that your K3s cluster meets Flux CD's requirements.

## Step 4: Bootstrap Flux CD

Bootstrap Flux CD to your Raspberry Pi cluster. Flux container images are multi-arch and include ARM64 variants, so no special image configuration is needed.

```bash
# Export your GitHub token
export GITHUB_TOKEN=<your-github-personal-access-token>

# Bootstrap Flux on the Raspberry Pi cluster
flux bootstrap github \
  --owner=your-github-username \
  --repository=pi-cluster-gitops \
  --branch=main \
  --path=clusters/raspberry-pi \
  --personal
```

This creates the Git repository if it does not exist, pushes the Flux manifests, and installs the controllers on your Pi cluster.

## Step 5: Optimize Flux Controller Resources

Raspberry Pi hardware has limited CPU and memory. The default Flux resource allocations may be too aggressive. Create Kustomize patches to reduce resource usage.

```yaml
# clusters/raspberry-pi/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  requests:
                    cpu: 50m
                    memory: 64Mi
                  limits:
                    cpu: 500m
                    memory: 512Mi
    target:
      kind: Deployment
      namespace: flux-system
      labelSelector: app.kubernetes.io/part-of=flux
```

This applies reduced resource limits to all Flux controllers. On a 4GB Raspberry Pi 4, this leaves sufficient memory for your workloads.

## Step 6: Reduce Reconciliation Frequency

Frequent reconciliation cycles consume CPU. For a home lab or edge environment, longer intervals are often acceptable.

```yaml
# clusters/raspberry-pi/flux-system/gotk-sync.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m  # Increase from default 1m to reduce CPU usage
  ref:
    branch: main
  url: ssh://git@github.com/your-github-username/pi-cluster-gitops
  secretRef:
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 15m  # Increase from default 10m
  path: ./clusters/raspberry-pi
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 7: Deploy a Sample Application

Deploy a sample application to verify that Flux is working correctly on your Raspberry Pi cluster. Make sure to use ARM64-compatible container images.

Create the following files in your Git repository:

```yaml
# clusters/raspberry-pi/apps/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sample-app
```

```yaml
# clusters/raspberry-pi/apps/deployment.yaml
# Use an ARM64-compatible nginx image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: sample-app
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
          # The official nginx image supports ARM64
          image: nginx:alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 25m
              memory: 32Mi
            limits:
              cpu: 100m
              memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: sample-app
spec:
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
  type: NodePort
```

Create a Kustomization to manage the app:

```yaml
# clusters/raspberry-pi/apps/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
```

Add a Flux Kustomization to watch this path:

```yaml
# clusters/raspberry-pi/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 15m
  path: ./clusters/raspberry-pi/apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: sample-app
```

Commit and push these files:

```bash
cd pi-cluster-gitops
git add -A
git commit -m "Add sample nginx app for Raspberry Pi"
git push origin main

# Trigger immediate reconciliation
flux reconcile kustomization flux-system --with-source
```

## Step 8: Verify the Deployment

```bash
# Check all Flux resources are healthy
flux get all

# Verify the sample app is running
kubectl get pods -n sample-app

# Check node resource utilization
kubectl top nodes
kubectl top pods -n flux-system
```

## Monitoring Resource Usage

On a Raspberry Pi, monitoring resource usage is crucial. Use `kubectl top` to track consumption.

```bash
# Check total resource usage across the cluster
kubectl top nodes

# Check Flux controller memory usage specifically
kubectl top pods -n flux-system --containers

# Check for any OOMKilled events
kubectl get events -n flux-system --field-selector reason=OOMKilling
```

## Tips for Running Flux on Raspberry Pi

- **Use USB SSDs instead of SD cards.** SD cards wear out quickly with the constant read/write operations from Kubernetes and Flux.
- **Disable components you do not need.** If you are not using Helm, skip the helm-controller to save resources.

```bash
# Install Flux without the helm-controller to save resources
flux install --components=source-controller,kustomize-controller,notification-controller
```

- **Use longer reconciliation intervals.** 10-15 minute intervals are usually sufficient for home labs.
- **Limit the number of GitRepositories.** Each repository requires cloning and storage, which is expensive on Pi hardware.
- **Consider a single-node cluster.** For learning and small workloads, a single Raspberry Pi 4 with 8GB RAM is sufficient.

## Summary

Flux CD runs natively on ARM64 architecture, making it fully compatible with Raspberry Pi Kubernetes clusters. The key to a successful deployment is optimizing resource allocations and reconciliation intervals for the Pi's limited hardware. Use K3s as your Kubernetes distribution, apply resource patches to reduce Flux controller footprint, and extend reconciliation intervals to minimize CPU usage. With these optimizations, Flux CD provides a complete GitOps experience even on a Raspberry Pi home lab cluster.
