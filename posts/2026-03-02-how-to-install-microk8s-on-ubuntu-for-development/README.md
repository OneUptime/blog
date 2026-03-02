# How to Install MicroK8s on Ubuntu for Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kubernetes, MicroK8s, Development, Container

Description: Complete guide to installing and configuring MicroK8s on Ubuntu for local development, including enabling add-ons, managing the cluster, and deploying test workloads.

---

MicroK8s is Canonical's lightweight Kubernetes distribution, designed to run entirely from a snap package. Unlike kubeadm clusters that require multiple components installed separately, MicroK8s bundles everything into a single snap that installs in seconds. It is ideal for local development, CI pipelines, and edge deployments where a full cluster is overkill.

## Why MicroK8s for Development

Several lightweight Kubernetes options exist - minikube, kind, k3s - each with trade-offs. MicroK8s stands out for Ubuntu users because:

- It is the closest to production Kubernetes behavior without the overhead
- It ships with a curated set of add-ons (Istio, Knative, GPU support) enabled with single commands
- It supports high availability mode for testing multi-node behavior locally
- Snap confinement keeps it isolated from system packages
- Updates follow upstream Kubernetes release tracks

## Installing MicroK8s

MicroK8s installs via snap. You can choose a specific Kubernetes version track to match your production environment.

```bash
# Install the latest stable release
sudo snap install microk8s --classic

# Or pin to a specific Kubernetes version
sudo snap install microk8s --classic --channel=1.29/stable

# Check available channels
snap info microk8s | grep -A 20 channels
```

### Add Your User to the microk8s Group

By default, MicroK8s commands require sudo. Adding your user to the `microk8s` group lets you run commands without elevated privileges.

```bash
# Add current user to microk8s group
sudo usermod -aG microk8s $USER

# Give user access to the .kube directory
mkdir -p ~/.kube
sudo chown -R $USER ~/.kube

# Apply group membership without logging out
newgrp microk8s
```

### Verify the Installation

```bash
# Check MicroK8s status and wait for it to be ready
microk8s status --wait-ready

# View running nodes
microk8s kubectl get nodes

# Check all system pods
microk8s kubectl get pods -A
```

## Configuring kubectl

You have two options for running kubectl commands: use the built-in `microk8s kubectl` wrapper, or configure the standard kubectl binary to use the MicroK8s kubeconfig.

```bash
# Option 1: Create an alias for convenience
echo "alias kubectl='microk8s kubectl'" >> ~/.bashrc
source ~/.bashrc

# Option 2: Merge MicroK8s config into your main kubeconfig
microk8s config > ~/.kube/config

# Verify kubectl connects to MicroK8s
kubectl cluster-info
```

## Enabling Essential Add-ons

MicroK8s ships with many add-ons disabled by default to minimize resource usage. Enable what you need for development.

### DNS

Nearly every Kubernetes workload needs DNS resolution. Enable CoreDNS:

```bash
microk8s enable dns

# Verify DNS is running
microk8s kubectl get pods -n kube-system -l k8s-app=kube-dns
```

### Dashboard

The Kubernetes Dashboard gives you a web UI for cluster management:

```bash
microk8s enable dashboard

# Get the dashboard token for login
microk8s kubectl -n kube-system describe secret \
  $(microk8s kubectl -n kube-system get secret | grep default-token | awk '{print $1}')

# Access via proxy
microk8s kubectl proxy

# Open: http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/
```

### Storage

Enable local path storage for persistent volumes in development:

```bash
microk8s enable hostpath-storage

# Verify the storage class is available
microk8s kubectl get storageclass
```

### Ingress

For routing external traffic to services:

```bash
microk8s enable ingress

# Verify the ingress controller is running
microk8s kubectl get pods -n ingress
```

### MetalLB (Load Balancer)

If you need LoadBalancer services in your local cluster:

```bash
# Enable MetalLB with an IP range from your local network
microk8s enable metallb:192.168.1.200-192.168.1.220
```

### Registry

A local container registry is useful to avoid hitting rate limits on Docker Hub during development:

```bash
microk8s enable registry

# The registry runs on localhost:32000
# Build and push a local image
docker build -t localhost:32000/my-app:latest .
docker push localhost:32000/my-app:latest
```

## Deploying a Test Application

With DNS and storage enabled, deploy a sample application:

```bash
# Create a namespace for testing
microk8s kubectl create namespace dev

# Deploy nginx with a service
microk8s kubectl apply -n dev -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
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
        image: nginx:1.25
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
EOF

# Check deployment status
microk8s kubectl get all -n dev
```

## Managing MicroK8s

### Starting and Stopping

MicroK8s starts automatically with the system. For development machines you may want manual control:

```bash
# Stop the cluster (frees up resources)
microk8s stop

# Start it again
microk8s start

# Inspect the cluster state
microk8s inspect
```

### Updating to a New Version

```bash
# Check current version
microk8s version

# Update to a new track
sudo snap refresh microk8s --channel=1.30/stable
```

### Resetting the Cluster

When your development environment gets messy and you want a clean slate:

```bash
# Remove all workloads and reset to a fresh state
microk8s reset

# For a complete reinstall
sudo snap remove microk8s
sudo snap install microk8s --classic
```

## Configuring Resource Limits

On development machines with limited RAM, constrain MicroK8s resource usage:

```bash
# Edit the kubelet configuration
sudo nano /var/snap/microk8s/current/args/kubelet

# Add these flags to limit resource usage
# --kube-reserved=cpu=500m,memory=512Mi
# --system-reserved=cpu=500m,memory=512Mi
# --eviction-hard=memory.available<200Mi

# Restart kubelet after changes
sudo systemctl restart snap.microk8s.daemon-kubelet
```

## Multi-Node Development Clusters

MicroK8s supports adding nodes for testing multi-node behavior:

```bash
# On the primary node, generate a join token
microk8s add-node

# Copy the join command and run it on the secondary node
# The output looks like:
# microk8s join 192.168.1.10:25000/TOKEN/SHA

# Verify all nodes are present
microk8s kubectl get nodes
```

## Common Troubleshooting

**MicroK8s stuck starting**: Run `microk8s inspect` to generate a diagnostic report. Often caused by containerd issues or storage problems.

**DNS resolution failing in pods**: Check that the dns add-on is enabled and CoreDNS pods are running. Also verify `/etc/resolv.conf` on the host isn't broken.

**Cannot push to local registry**: Ensure Docker is configured to allow the insecure registry at `localhost:32000`. Add `{"insecure-registries": ["localhost:32000"]}` to `/etc/docker/daemon.json`.

**Snap confined networking issues**: If pods cannot reach the internet, check that `net.ipv4.ip_forward=1` is set and the snap interfaces are connected: `sudo snap connect microk8s:network-control`.

MicroK8s gives Ubuntu developers a production-grade Kubernetes environment without the operational burden. The snap-based installation means zero dependency conflicts, and the built-in add-on system covers most development scenarios with simple enable commands.
