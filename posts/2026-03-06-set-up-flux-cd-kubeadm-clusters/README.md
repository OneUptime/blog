# How to Set Up Flux CD on Kubeadm Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kubeadm, kubernetes, gitops, continuous delivery, self-managed, bare metal

Description: A hands-on guide to installing Flux CD on self-managed Kubernetes clusters bootstrapped with kubeadm for GitOps-driven deployments.

---

## Introduction

Kubeadm is the official Kubernetes tool for creating and managing clusters. It provides the minimum viable cluster setup and is the foundation for many Kubernetes distributions. Running Flux CD on a kubeadm cluster gives you full control over both the cluster infrastructure and the GitOps deployment pipeline, making it ideal for on-premises environments, labs, and custom Kubernetes setups.

This guide covers creating a kubeadm cluster from scratch and deploying Flux CD for automated application delivery.

## Prerequisites

Before starting, ensure you have:

- At least two Linux machines (Ubuntu 22.04 recommended) with 2 CPU cores and 2 GB RAM each
- Root or sudo access on all machines
- Network connectivity between all nodes
- A GitHub account with a personal access token
- `flux` CLI installed on your workstation

## Preparing the Nodes

Run these steps on all nodes (control plane and workers):

```bash
# Disable swap (required by Kubernetes)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Load required kernel modules
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# Set required sysctl parameters
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

## Installing Container Runtime

Install containerd on all nodes:

```bash
# Install containerd
sudo apt-get update
sudo apt-get install -y containerd

# Create default configuration
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Enable SystemdCgroup in containerd config
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

# Restart containerd
sudo systemctl restart containerd
sudo systemctl enable containerd
```

## Installing Kubeadm, Kubelet, and Kubectl

Install Kubernetes components on all nodes:

```bash
# Add the Kubernetes apt repository
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gpg

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list

# Install kubeadm, kubelet, and kubectl
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl

# Prevent automatic updates
sudo apt-mark hold kubelet kubeadm kubectl
```

## Initializing the Control Plane

On the control plane node, initialize the cluster:

```bash
# Initialize the Kubernetes control plane
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=10.0.0.10

# Configure kubectl for the current user
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

Save the join command output for worker nodes. It looks like:

```bash
# Example join command (yours will be different)
kubeadm join 10.0.0.10:6443 --token abcdef.0123456789abcdef \
  --discovery-token-ca-cert-hash sha256:...
```

## Joining Worker Nodes

On each worker node, run the join command from the previous step:

```bash
# Join the worker node to the cluster
sudo kubeadm join 10.0.0.10:6443 \
  --token abcdef.0123456789abcdef \
  --discovery-token-ca-cert-hash sha256:<hash>
```

## Installing a CNI Plugin

Install a Container Network Interface plugin. This example uses Flannel:

```bash
# Install Flannel CNI
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Wait for all nodes to become Ready
kubectl get nodes --watch
```

## Verifying the Cluster

Confirm the cluster is healthy:

```bash
# Check node status
kubectl get nodes

# Verify system pods
kubectl get pods -n kube-system

# Verify DNS is working
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- nslookup kubernetes.default
```

## Installing the Flux CLI

On your workstation (or the control plane node):

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version
```

## Running Flux Pre-flight Checks

Run the pre-flight checks:

```bash
# Check cluster compatibility
flux check --pre
```

A properly configured kubeadm cluster should pass all checks.

## Bootstrapping Flux CD

Set up GitHub credentials and bootstrap Flux:

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=kubeadm-gitops \
  --branch=main \
  --path=./clusters/kubeadm \
  --personal
```

## Verifying the Flux Installation

Check that all Flux controllers are running:

```bash
# Verify Flux health
flux check

# List Flux pods
kubectl get pods -n flux-system

# Check Git source
flux get sources git
```

## Setting Up the Repository Structure

Clone and organize your GitOps repository:

```bash
# Clone the repository
git clone https://github.com/$GITHUB_USER/kubeadm-gitops.git
cd kubeadm-gitops

# Create directory structure
mkdir -p clusters/kubeadm/infrastructure
mkdir -p clusters/kubeadm/apps
mkdir -p infrastructure/sources
mkdir -p infrastructure/controllers
mkdir -p infrastructure/storage
mkdir -p apps/base
mkdir -p apps/production
```

## Setting Up Storage

Kubeadm clusters do not include a default storage provisioner. Install one via Flux:

```yaml
# infrastructure/sources/rancher.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: rancher-local-path
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.containeroo.ch
```

```yaml
# infrastructure/storage/local-path.yaml
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
        name: rancher-local-path
        namespace: flux-system
  targetNamespace: local-path-storage
  install:
    createNamespace: true
  values:
    storageClass:
      # Set as default storage class
      defaultClass: true
      name: local-path
    nodePathMap:
      - node: DEFAULT_PATH_FOR_NON_LISTED_NODES
        paths:
          - /opt/local-path-provisioner
```

## Installing an Ingress Controller

Deploy an ingress controller for external access:

```yaml
# infrastructure/sources/ingress-nginx.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 24h
  url: https://kubernetes.github.io/ingress-nginx
```

```yaml
# infrastructure/controllers/ingress.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 15m
  chart:
    spec:
      chart: ingress-nginx
      version: ">=4.8.0"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  targetNamespace: ingress-nginx
  install:
    createNamespace: true
  values:
    controller:
      replicaCount: 2
      # For bare metal kubeadm clusters, use NodePort or hostNetwork
      service:
        type: NodePort
        nodePorts:
          http: 30080
          https: 30443
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
```

Wire infrastructure components together:

```yaml
# clusters/kubeadm/infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../infrastructure/sources/rancher.yaml
  - ../../../infrastructure/sources/ingress-nginx.yaml
  - ../../../infrastructure/storage/local-path.yaml
  - ../../../infrastructure/controllers/ingress.yaml
```

```yaml
# clusters/kubeadm/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/kubeadm/infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

## Deploying Applications

Create an application deployment:

```yaml
# apps/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: apps
  labels:
    managed-by: flux
```

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-kubeadm
  namespace: apps
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello-kubeadm
  template:
    metadata:
      labels:
        app: hello-kubeadm
    spec:
      containers:
        - name: hello
          image: nginx:1.27-alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
```

```yaml
# apps/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-kubeadm
  namespace: apps
spec:
  selector:
    app: hello-kubeadm
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

```yaml
# apps/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello-kubeadm
  namespace: apps
spec:
  ingressClassName: nginx
  rules:
    - host: hello.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: hello-kubeadm
                port:
                  number: 80
```

```yaml
# apps/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

```yaml
# clusters/kubeadm/apps/hello-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: hello-kubeadm
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: infrastructure
  path: ./apps/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: hello-kubeadm
      namespace: apps
  timeout: 3m
```

Commit and push:

```bash
git add -A
git commit -m "Add infrastructure and demo application"
git push origin main
```

## Monitoring Reconciliation

Watch Flux deploy your resources:

```bash
# Watch Kustomization status
flux get kustomizations --watch

# Check application pods
kubectl get pods -n apps

# View Flux events
flux events
```

## Adding MetalLB for LoadBalancer Support

Kubeadm clusters on bare metal do not support LoadBalancer services by default. Add MetalLB through Flux:

```yaml
# infrastructure/sources/metallb.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: metallb
  namespace: flux-system
spec:
  interval: 24h
  url: https://metallb.github.io/metallb
```

```yaml
# infrastructure/controllers/metallb.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: metallb
  namespace: flux-system
spec:
  interval: 15m
  chart:
    spec:
      chart: metallb
      version: ">=0.14.0"
      sourceRef:
        kind: HelmRepository
        name: metallb
        namespace: flux-system
  targetNamespace: metallb-system
  install:
    createNamespace: true
  values:
    speaker:
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
```

```yaml
# infrastructure/controllers/metallb-config.yaml
# Apply after MetalLB is installed
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    # Adjust this range to match your network
    - 10.0.0.200-10.0.0.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
spec:
  ipAddressPools:
    - default-pool
```

## Upgrading Kubernetes with Kubeadm

When upgrading your kubeadm cluster, Flux continues to reconcile after the upgrade completes:

```bash
# On the control plane node
sudo apt-mark unhold kubeadm
sudo apt-get update
sudo apt-get install -y kubeadm=1.31.0-1.1

# Plan the upgrade
sudo kubeadm upgrade plan

# Apply the upgrade
sudo kubeadm upgrade apply v1.31.0

# Upgrade kubelet and kubectl
sudo apt-mark unhold kubelet kubectl
sudo apt-get install -y kubelet=1.31.0-1.1 kubectl=1.31.0-1.1
sudo apt-mark hold kubelet kubectl kubeadm

# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# Verify Flux is still reconciling after upgrade
flux get kustomizations
flux check
```

## Troubleshooting

Common issues and solutions:

```bash
# Check Flux controller logs
kubectl logs -n flux-system deploy/source-controller
kubectl logs -n flux-system deploy/kustomize-controller

# Force reconciliation
flux reconcile kustomization flux-system --with-source

# Debug networking issues
kubectl get pods -n kube-flannel
kubectl logs -n kube-flannel -l app=flannel

# Verify kubelet status
sudo systemctl status kubelet
sudo journalctl -u kubelet -f

# Check for resource pressure
kubectl describe nodes | grep -A5 Conditions

# View Flux events
flux events --for Kustomization/hello-kubeadm
```

## Conclusion

You now have Flux CD running on a self-managed kubeadm Kubernetes cluster. This setup gives you complete control over every layer of your infrastructure, from the OS and container runtime through to the application deployment pipeline. Every change to your Git repository is automatically reconciled by Flux, ensuring your kubeadm cluster stays in sync with your desired state. This approach works well for on-premises deployments, lab environments, and any scenario where you need full control over your Kubernetes infrastructure.
