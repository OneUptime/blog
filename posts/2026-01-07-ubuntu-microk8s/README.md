# How to Install MicroK8s on Ubuntu for Lightweight Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, MicroK8s, Kubernetes, DevOps, Containers

Description: Install and configure MicroK8s on Ubuntu for lightweight Kubernetes development and edge deployments with essential addons.

---

## Introduction

MicroK8s is a lightweight, fast, and fully conformant Kubernetes distribution developed by Canonical. It's designed to be minimal yet powerful, making it ideal for development environments, edge computing, IoT devices, and small-scale production deployments. Unlike traditional Kubernetes installations that can be complex and resource-intensive, MicroK8s provides a streamlined experience that gets you running Kubernetes in minutes.

In this comprehensive guide, we'll walk through everything you need to know about installing and configuring MicroK8s on Ubuntu, from basic setup to production-ready configurations.

## MicroK8s vs Other Kubernetes Distributions

Before diving into the installation, let's understand how MicroK8s compares to other popular Kubernetes distributions:

### MicroK8s

**Pros:**
- Single-package installation via snap
- Low memory footprint (as low as 540MB)
- Automatic updates with snap channels
- Built-in add-ons for common functionality
- High availability support
- Strict confinement for security
- Native GPU support

**Cons:**
- Snap dependency on non-Ubuntu systems
- Some network limitations in strict mode

### K3s

**Pros:**
- Single binary installation
- Lightweight and fast
- Built-in SQLite (no etcd required for single-node)
- Good for ARM devices

**Cons:**
- Removes some Kubernetes features by default
- Different networking model
- Manual add-on management

### Minikube

**Pros:**
- Cross-platform support
- Multiple driver options (Docker, VirtualBox, etc.)
- Good for local development

**Cons:**
- Runs inside a VM (overhead)
- Single-node only
- Higher resource requirements

### Kind (Kubernetes in Docker)

**Pros:**
- Fast cluster creation
- Multi-node clusters
- Great for CI/CD testing

**Cons:**
- Docker dependency
- Not suitable for production
- Limited persistence options

### When to Choose MicroK8s

MicroK8s is ideal when you need:
- A production-grade Kubernetes on Ubuntu
- Edge computing or IoT deployments
- Development environments that mirror production
- GPU workloads
- Multi-node clusters with minimal overhead
- Automatic security updates

## Prerequisites

Before installing MicroK8s, ensure your system meets these requirements:

### Hardware Requirements

| Deployment Type | CPU | RAM | Disk |
|----------------|-----|-----|------|
| Minimal | 1 core | 540MB | 20GB |
| Development | 2 cores | 4GB | 40GB |
| Production | 4+ cores | 8GB+ | 100GB+ |

### Software Requirements

- Ubuntu 18.04 LTS or later (20.04 or 22.04 recommended)
- snapd installed (comes pre-installed on Ubuntu)
- sudo privileges
- Network connectivity

### Check your Ubuntu version
```bash
# Display Ubuntu version information
lsb_release -a
```

### Verify snapd is installed
```bash
# Check if snap is available and its version
snap version
```

## Installing MicroK8s

MicroK8s is distributed as a snap package, making installation straightforward and ensuring you get automatic updates.

### Basic Installation

Install MicroK8s from the stable channel:
```bash
# Install MicroK8s from the stable channel (recommended for production)
sudo snap install microk8s --classic --channel=1.28/stable
```

You can also install the latest version:
```bash
# Install the latest stable version of MicroK8s
sudo snap install microk8s --classic
```

### Available Channels

MicroK8s offers different release channels:
```bash
# List available MicroK8s channels
snap info microk8s | grep -E "^\s+[0-9]+\.[0-9]+"
```

Common channels include:
- `stable` - Latest stable release
- `1.28/stable` - Specific Kubernetes version
- `edge` - Latest development version
- `candidate` - Release candidates

### Post-Installation Setup

Add your user to the microk8s group to avoid using sudo:
```bash
# Add current user to the microk8s group
sudo usermod -a -G microk8s $USER

# Create the .kube directory if it doesn't exist
mkdir -p ~/.kube

# Change ownership of the .kube directory
sudo chown -f -R $USER ~/.kube
```

Apply the group changes without logging out:
```bash
# Reload the group membership
newgrp microk8s
```

### Verify Installation

Check the status of MicroK8s:
```bash
# Wait for MicroK8s to be ready and display status
microk8s status --wait-ready
```

Expected output:
```
microk8s is running
high-availability: no
  datastore master nodes: 127.0.0.1:19001
  datastore standby nodes: none
addons:
  enabled:
    ha-cluster           # (core) Configure high availability on the current node
  disabled:
    cert-manager         # (core) Cloud native certificate management
    community            # (core) The community addons repository
    dashboard            # (core) The Kubernetes dashboard
    dns                  # (core) CoreDNS
    ...
```

## Essential Add-ons

MicroK8s comes with a rich ecosystem of add-ons that extend its functionality. Let's enable the most commonly needed ones.

### CoreDNS (DNS Resolution)

DNS is essential for service discovery within the cluster:
```bash
# Enable CoreDNS for internal service discovery
microk8s enable dns
```

You can also specify custom upstream DNS servers:
```bash
# Enable DNS with custom upstream servers
microk8s enable dns:8.8.8.8,8.8.4.4
```

### Storage (Host Path Provisioner)

Enable dynamic storage provisioning for persistent volumes:
```bash
# Enable the hostpath storage provisioner
microk8s enable hostpath-storage
```

Verify the storage class is available:
```bash
# List available storage classes
microk8s kubectl get storageclass
```

### Ingress Controller

Enable the NGINX ingress controller for external access:
```bash
# Enable NGINX ingress controller
microk8s enable ingress
```

Verify the ingress controller is running:
```bash
# Check ingress controller pods
microk8s kubectl get pods -n ingress
```

### Enable Multiple Add-ons at Once

You can enable multiple add-ons in a single command:
```bash
# Enable commonly used add-ons together
microk8s enable dns storage ingress dashboard metrics-server
```

### Available Add-ons

List all available add-ons:
```bash
# Display all available add-ons and their status
microk8s status
```

Common add-ons include:
- `dashboard` - Kubernetes Dashboard UI
- `metrics-server` - Resource metrics for HPA
- `prometheus` - Monitoring stack
- `registry` - Private Docker registry
- `metallb` - Load balancer for bare metal
- `cert-manager` - TLS certificate management
- `helm` - Helm 3 package manager
- `rbac` - Role-Based Access Control
- `gpu` - NVIDIA GPU support
- `istio` - Service mesh

## Configuring kubectl

MicroK8s comes with its own kubectl wrapper, but you can also configure the standard kubectl to work with it.

### Using the Built-in kubectl

MicroK8s includes kubectl as a bundled command:
```bash
# Use the built-in kubectl
microk8s kubectl get nodes

# Get all pods across namespaces
microk8s kubectl get pods -A

# Describe the cluster
microk8s kubectl cluster-info
```

### Creating an Alias

For convenience, create an alias:
```bash
# Add kubectl alias to your shell configuration
echo "alias kubectl='microk8s kubectl'" >> ~/.bashrc

# Reload the configuration
source ~/.bashrc
```

### Exporting the Kubeconfig

Export the kubeconfig for use with standard kubectl:
```bash
# Export the kubeconfig file
microk8s config > ~/.kube/config

# Set proper permissions on the config file
chmod 600 ~/.kube/config
```

### Using Multiple Clusters

If you have multiple Kubernetes clusters, merge the configs:
```bash
# Export MicroK8s config to a separate file
microk8s config > ~/.kube/microk8s-config

# Set the KUBECONFIG environment variable to include both configs
export KUBECONFIG=~/.kube/config:~/.kube/microk8s-config

# Merge the configs into a single file
kubectl config view --flatten > ~/.kube/merged-config

# Use the merged config
export KUBECONFIG=~/.kube/merged-config
```

### Verifying kubectl Access

Verify that kubectl can communicate with the cluster:
```bash
# Check the cluster version
kubectl version

# Get cluster information
kubectl cluster-info

# List all nodes in the cluster
kubectl get nodes -o wide
```

## Multi-Node Clustering

MicroK8s supports multi-node clusters for high availability and increased capacity. Here's how to set up a cluster.

### Prerequisites for Multi-Node

Ensure all nodes:
- Have MicroK8s installed with the same version
- Can communicate over the network
- Have unique hostnames
- Have ports 25000 (cluster), 16443 (API), and 10250 (kubelet) open

### Generating the Join Token

On the primary node, generate a join token:
```bash
# Generate a join token on the primary node
microk8s add-node
```

This outputs something like:
```
From the node you wish to join to this cluster, run the following:
microk8s join 192.168.1.100:25000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

Use the '--worker' flag to join a node as a worker not running the control plane.
```

### Joining Worker Nodes

On each worker node, run the join command:
```bash
# Join as a worker node (no control plane components)
microk8s join 192.168.1.100:25000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6 --worker
```

Or join as a full control plane node:
```bash
# Join as a control plane node (for HA)
microk8s join 192.168.1.100:25000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Verifying the Cluster

Check the cluster nodes:
```bash
# List all nodes in the cluster
microk8s kubectl get nodes

# Get detailed node information
microk8s kubectl get nodes -o wide
```

### High Availability Configuration

For production HA, you need at least 3 control plane nodes:
```bash
# Enable HA on each control plane node
microk8s enable ha-cluster
```

Check HA status:
```bash
# Verify HA cluster status
microk8s status | grep -A5 "high-availability"
```

### Removing Nodes

To remove a node from the cluster:
```bash
# On the primary node, remove a worker
microk8s remove-node <node-name>

# On the node being removed, leave the cluster
microk8s leave
```

### Cluster Networking

Configure cluster networking for multi-node setups:
```bash
# Enable Calico CNI for advanced networking
microk8s enable community
microk8s enable calico
```

## GPU Support

MicroK8s provides native support for NVIDIA GPUs, making it ideal for machine learning and AI workloads.

### Prerequisites

Before enabling GPU support:

Install NVIDIA drivers on the host:
```bash
# Add the NVIDIA driver repository
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt update

# Install the recommended NVIDIA driver
sudo ubuntu-drivers autoinstall

# Alternatively, install a specific driver version
sudo apt install nvidia-driver-535

# Reboot to apply the driver
sudo reboot
```

Verify the driver installation:
```bash
# Check NVIDIA driver and GPU status
nvidia-smi
```

### Enabling GPU Support

Enable the NVIDIA GPU addon:
```bash
# Enable NVIDIA GPU support in MicroK8s
microk8s enable gpu
```

This installs the NVIDIA device plugin and container runtime:
```bash
# Verify GPU addon is enabled
microk8s status | grep gpu

# Check the NVIDIA device plugin
microk8s kubectl get pods -n kube-system | grep nvidia
```

### Testing GPU Access

Deploy a test pod to verify GPU access:
```bash
# Create a test GPU pod
microk8s kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  restartPolicy: OnFailure
  containers:
  - name: cuda-container
    image: nvidia/cuda:12.0.0-base-ubuntu22.04
    command: ["nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1
EOF
```

Check the pod logs:
```bash
# View the GPU test output
microk8s kubectl logs gpu-test
```

### GPU Resource Limits

Request specific GPU resources in your deployments:
```yaml
# Example deployment with GPU resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      containers:
      - name: inference
        image: my-ml-model:latest
        resources:
          limits:
            # Request 2 GPUs for this container
            nvidia.com/gpu: 2
          requests:
            memory: "4Gi"
            cpu: "2"
```

### GPU Monitoring

Monitor GPU usage in the cluster:
```bash
# Install DCGM exporter for GPU metrics
microk8s kubectl apply -f https://raw.githubusercontent.com/NVIDIA/dcgm-exporter/main/dcgm-exporter.yaml

# View GPU metrics
microk8s kubectl get pods -l app=dcgm-exporter
```

## Production Hardening

For production deployments, follow these best practices to secure and harden your MicroK8s cluster.

### Enable RBAC

Role-Based Access Control is essential for production:
```bash
# Enable RBAC
microk8s enable rbac
```

Create a service account with limited permissions:
```bash
# Create a namespace for the application
microk8s kubectl create namespace production

# Create a service account
microk8s kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-role
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-role-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: app-service-account
  namespace: production
roleRef:
  kind: Role
  name: app-role
  apiGroup: rbac.authorization.k8s.io
EOF
```

### Network Policies

Implement network policies for pod isolation:
```bash
# Enable Calico for network policies
microk8s enable community
microk8s enable calico
```

Create a network policy:
```bash
# Apply a default deny-all ingress policy
microk8s kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
# Allow traffic only from specific pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
EOF
```

### Pod Security Standards

Apply Pod Security Standards for workload protection:
```bash
# Label namespace for pod security enforcement
microk8s kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted
```

### TLS Certificates with cert-manager

Enable automatic TLS certificate management:
```bash
# Enable cert-manager
microk8s enable cert-manager
```

Create a ClusterIssuer for Let's Encrypt:
```bash
# Create a Let's Encrypt ClusterIssuer
microk8s kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: admin@example.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Resource Quotas

Limit resource consumption per namespace:
```bash
# Apply resource quotas to the production namespace
microk8s kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
EOF
```

### Limit Ranges

Set default resource limits for containers:
```bash
# Apply limit ranges to enforce resource constraints
microk8s kubectl apply -f - <<EOF
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    max:
      cpu: "2"
      memory: "4Gi"
    min:
      cpu: "50m"
      memory: "64Mi"
    type: Container
EOF
```

### Secure the API Server

Configure API server security options:
```bash
# Edit MicroK8s configuration for additional security
sudo nano /var/snap/microk8s/current/args/kube-apiserver
```

Add recommended security flags:
```
# Add these flags to kube-apiserver configuration
--anonymous-auth=false
--audit-log-path=/var/log/kubernetes/audit.log
--audit-log-maxage=30
--audit-log-maxbackup=10
--audit-log-maxsize=100
```

Restart MicroK8s to apply changes:
```bash
# Restart MicroK8s to apply API server changes
microk8s stop && microk8s start
```

### Enable Audit Logging

Configure audit logging for security monitoring:
```bash
# Create an audit policy file
sudo tee /var/snap/microk8s/current/args/audit-policy.yaml <<EOF
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all requests at the Metadata level
  - level: Metadata
    resources:
    - group: ""
      resources: ["secrets", "configmaps"]
  # Log pod changes at RequestResponse level
  - level: RequestResponse
    resources:
    - group: ""
      resources: ["pods"]
    verbs: ["create", "update", "patch", "delete"]
  # Default: log at Metadata level
  - level: Metadata
EOF
```

### Automatic Updates

Configure automatic security updates:
```bash
# Configure snap to automatically refresh MicroK8s
sudo snap set microk8s config.refresh.timer=sat,04:00

# Hold updates if you need stability (use with caution)
# sudo snap refresh --hold microk8s
```

## Monitoring and Observability

Set up comprehensive monitoring for your cluster.

### Enable the Observability Stack

Install the full observability stack:
```bash
# Enable Prometheus, Grafana, and alerting
microk8s enable observability
```

Access Grafana dashboard:
```bash
# Get the Grafana admin password
microk8s kubectl get secret -n observability grafana -o jsonpath="{.data.admin-password}" | base64 -d

# Port-forward Grafana for local access
microk8s kubectl port-forward -n observability svc/grafana 3000:3000
```

### Enable Metrics Server

For basic resource metrics:
```bash
# Enable metrics server for kubectl top commands
microk8s enable metrics-server
```

View resource usage:
```bash
# View node resource usage
microk8s kubectl top nodes

# View pod resource usage
microk8s kubectl top pods -A
```

### Enable Dashboard

Install the Kubernetes Dashboard:
```bash
# Enable the Kubernetes dashboard
microk8s enable dashboard
```

Access the dashboard:
```bash
# Create a dashboard access token
microk8s kubectl create token default

# Port-forward the dashboard
microk8s kubectl port-forward -n kube-system svc/kubernetes-dashboard 10443:443
```

## Backup and Recovery

Implement backup strategies for your MicroK8s cluster.

### Backing Up Cluster State

Create a backup of the cluster data:
```bash
# Stop MicroK8s before backing up
microk8s stop

# Backup the entire MicroK8s data directory
sudo tar -czvf microk8s-backup-$(date +%Y%m%d).tar.gz /var/snap/microk8s/current/

# Start MicroK8s again
microk8s start
```

### Backing Up Workloads

Export all workload definitions:
```bash
# Export all resources from all namespaces
microk8s kubectl get all --all-namespaces -o yaml > cluster-resources-backup.yaml

# Export specific resource types
microk8s kubectl get deployments,services,configmaps,secrets -A -o yaml > workloads-backup.yaml
```

### Using Velero for Backups

Install Velero for production-grade backups:
```bash
# Enable Helm if not already enabled
microk8s enable helm3

# Add Velero Helm repository
microk8s helm3 repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts

# Install Velero (example with local storage)
microk8s helm3 install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.provider=aws \
  --set configuration.backupStorageLocation.bucket=velero-backups \
  --set snapshotsEnabled=false
```

## Troubleshooting

Common issues and their solutions.

### MicroK8s Won't Start

Check the service status:
```bash
# Check MicroK8s service status
microk8s inspect

# View detailed logs
sudo journalctl -u snap.microk8s.daemon-kubelite -f
```

### DNS Resolution Issues

Verify CoreDNS is running:
```bash
# Check CoreDNS pods
microk8s kubectl get pods -n kube-system -l k8s-app=kube-dns

# Test DNS resolution from within a pod
microk8s kubectl run dns-test --image=busybox --rm -it --restart=Never -- nslookup kubernetes
```

### Storage Issues

Check storage class and PVC status:
```bash
# Verify storage class exists
microk8s kubectl get storageclass

# Check PVC status
microk8s kubectl get pvc -A

# Describe a problematic PVC
microk8s kubectl describe pvc <pvc-name> -n <namespace>
```

### Node Not Ready

Diagnose node issues:
```bash
# Check node conditions
microk8s kubectl describe node <node-name>

# View kubelet logs
sudo journalctl -u snap.microk8s.daemon-kubelet -f
```

### Reset MicroK8s

If all else fails, reset the installation:
```bash
# Reset MicroK8s to a clean state (WARNING: destroys all data)
microk8s reset --destroy-storage

# Reinstall add-ons
microk8s enable dns storage ingress
```

## Upgrading MicroK8s

Keep your cluster up to date with the latest security patches and features.

### Check Current Version

View the current version:
```bash
# Display current MicroK8s version
microk8s version
```

### Upgrade to Latest in Current Channel

Refresh to the latest version:
```bash
# Refresh MicroK8s to the latest in current channel
sudo snap refresh microk8s
```

### Upgrade to a New Kubernetes Version

Switch to a new Kubernetes version channel:
```bash
# List available channels
snap info microk8s

# Switch to a new version (e.g., 1.29)
sudo snap refresh microk8s --channel=1.29/stable
```

### Rolling Upgrades in Multi-Node Clusters

Upgrade multi-node clusters safely:
```bash
# Drain a node before upgrading
microk8s kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Upgrade the node
sudo snap refresh microk8s --channel=1.29/stable

# Uncordon the node after upgrade
microk8s kubectl uncordon <node-name>
```

## Conclusion

MicroK8s provides a powerful yet lightweight Kubernetes experience that's perfect for development, edge computing, and production deployments on Ubuntu. Its snap-based installation ensures easy updates and maintenance, while the rich add-on ecosystem covers most production requirements out of the box.

Key takeaways:
- **Quick Start**: Single command installation gets you running in minutes
- **Essential Add-ons**: DNS, storage, and ingress are must-haves for most deployments
- **Multi-Node Ready**: Easy clustering for high availability
- **GPU Support**: Native NVIDIA GPU support for ML/AI workloads
- **Production Ready**: RBAC, network policies, and cert-manager for security

Whether you're developing locally, running edge workloads, or deploying production services, MicroK8s offers the right balance of simplicity and power for your Kubernetes needs.

## Additional Resources

- [MicroK8s Official Documentation](https://microk8s.io/docs)
- [MicroK8s GitHub Repository](https://github.com/canonical/microk8s)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)
- [NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/)

Start with MicroK8s today and experience the simplicity of production-grade Kubernetes on Ubuntu!
