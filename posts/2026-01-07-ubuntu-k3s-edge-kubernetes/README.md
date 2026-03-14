# How to Set Up K3s on Ubuntu for Edge Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, K3s, Kubernetes, Edge, DevOps

Description: Deploy K3s on Ubuntu for lightweight edge Kubernetes with single-node and multi-node cluster configurations.

---

Kubernetes has become the de facto standard for container orchestration, but its resource requirements can be prohibitive for edge computing scenarios. K3s, a lightweight Kubernetes distribution created by Rancher Labs (now part of SUSE), addresses this challenge by providing a fully compliant Kubernetes cluster that runs efficiently on resource-constrained environments. This guide walks you through setting up K3s on Ubuntu for edge Kubernetes deployments.

## Table of Contents

1. [Understanding K3s vs K8s](#understanding-k3s-vs-k8s)
2. [Prerequisites](#prerequisites)
3. [Single-Node Installation](#single-node-installation)
4. [Multi-Node Cluster Setup](#multi-node-cluster-setup)
5. [Embedded etcd vs External Datastore](#embedded-etcd-vs-external-datastore)
6. [Traefik Ingress Configuration](#traefik-ingress-configuration)
7. [Local Storage Provisioner](#local-storage-provisioner)
8. [Air-Gapped Installation](#air-gapped-installation)
9. [Verification and Troubleshooting](#verification-and-troubleshooting)
10. [Conclusion](#conclusion)

## Understanding K3s vs K8s

Before diving into the installation, it is essential to understand what makes K3s different from standard Kubernetes (K8s):

### Size and Resource Requirements

| Aspect | K8s (Standard) | K3s |
|--------|---------------|-----|
| Binary Size | ~1GB+ | ~100MB |
| Memory (Server) | 2GB+ minimum | 512MB minimum |
| Memory (Agent) | 1GB+ minimum | 256MB minimum |
| CPU | 2+ cores | 1 core viable |

### Key Differences

**Simplified Architecture**: K3s packages everything into a single binary, including containerd, Flannel, CoreDNS, and Traefik. Standard K8s requires separate installations of these components.

**Removed Components**: K3s removes legacy and alpha features, in-tree cloud provider plugins, and storage drivers that are rarely used in edge scenarios.

**Embedded Components**:
- containerd as the container runtime (instead of Docker)
- Flannel for CNI networking
- CoreDNS for service discovery
- Traefik for ingress
- Local-path-provisioner for storage
- SQLite as the default datastore (can use etcd or external databases)

**Edge-Optimized Features**:
- ARM64 and ARMv7 support
- Reduced memory footprint
- Fast startup times
- Simple installation and upgrades

### When to Use K3s

K3s is ideal for:
- Edge computing and IoT deployments
- Development and testing environments
- CI/CD pipelines
- Resource-constrained servers
- Single-node production deployments
- Raspberry Pi clusters

Standard K8s is better for:
- Large-scale enterprise deployments
- Complex multi-tenant environments
- Scenarios requiring specific cloud provider integrations
- Environments needing full Kubernetes feature set

## Prerequisites

Before installing K3s, ensure your Ubuntu system meets these requirements:

### System Requirements

- Ubuntu 18.04, 20.04, 22.04, or 24.04 (LTS versions recommended)
- Minimum 512MB RAM (1GB+ recommended for production)
- Minimum 1 CPU core
- 20GB+ available disk space
- Root or sudo access

### Network Requirements

The following ports must be accessible:

| Port | Protocol | Purpose |
|------|----------|---------|
| 6443 | TCP | Kubernetes API server |
| 8472 | UDP | Flannel VXLAN |
| 10250 | TCP | Kubelet metrics |
| 2379-2380 | TCP | etcd (if using embedded etcd) |
| 51820-51821 | UDP | Flannel Wireguard (if enabled) |

### Initial System Preparation

Update your Ubuntu system and install required packages:

```bash
# Update the package index and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y curl wget apt-transport-https ca-certificates

# Disable swap (Kubernetes requires swap to be disabled)
sudo swapoff -a

# Permanently disable swap by commenting out swap entries in fstab
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Verify swap is disabled
free -h
```

### Configure Kernel Modules and Parameters

Load required kernel modules for container networking:

```bash
# Load required kernel modules
sudo modprobe br_netfilter
sudo modprobe overlay

# Ensure modules load on boot
cat <<EOF | sudo tee /etc/modules-load.d/k3s.conf
br_netfilter
overlay
EOF

# Configure sysctl parameters for Kubernetes networking
cat <<EOF | sudo tee /etc/sysctl.d/k3s.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

# Apply sysctl parameters without reboot
sudo sysctl --system
```

### Configure Firewall (if enabled)

If you are using UFW firewall, configure the necessary rules:

```bash
# Allow K3s API server port
sudo ufw allow 6443/tcp

# Allow Flannel VXLAN traffic
sudo ufw allow 8472/udp

# Allow Kubelet metrics
sudo ufw allow 10250/tcp

# Allow etcd ports (for multi-server HA setup)
sudo ufw allow 2379:2380/tcp

# Reload firewall rules
sudo ufw reload

# Check firewall status
sudo ufw status
```

## Single-Node Installation

The simplest K3s deployment is a single-node cluster where one machine runs both the control plane and workloads. This is perfect for development, testing, or small edge deployments.

### Basic Installation

Install K3s using the official installation script:

```bash
# Download and run the K3s installation script
# This installs K3s as a systemd service that starts automatically
curl -sfL https://get.k3s.io | sh -

# The installation process:
# 1. Downloads the K3s binary
# 2. Creates systemd service files
# 3. Generates TLS certificates
# 4. Starts the K3s server
```

### Verify Installation

Check that K3s is running correctly:

```bash
# Check the K3s service status
sudo systemctl status k3s

# View K3s logs for any startup issues
sudo journalctl -u k3s -f

# Verify the cluster is running and node is ready
sudo kubectl get nodes

# Check all system pods are running
sudo kubectl get pods -n kube-system
```

### Configure kubectl Access

Set up kubectl access without requiring sudo:

```bash
# Create kubectl configuration directory for your user
mkdir -p ~/.kube

# Copy the K3s kubeconfig file to user directory
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config

# Change ownership to current user
sudo chown $(id -u):$(id -g) ~/.kube/config

# Set proper permissions (kubeconfig contains sensitive credentials)
chmod 600 ~/.kube/config

# Verify kubectl works without sudo
kubectl get nodes
kubectl cluster-info
```

### Installation with Custom Options

K3s supports numerous configuration options for customization:

```bash
# Install K3s with custom options:
# --disable traefik: Skip Traefik ingress if you prefer another
# --disable servicelb: Skip the built-in load balancer
# --write-kubeconfig-mode 644: Make kubeconfig readable without sudo
# --node-name: Set a custom node name
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --node-name edge-node-1 \
  --disable traefik

# Install with a specific K3s version
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=v1.28.4+k3s2 sh -

# Install with custom cluster CIDR and service CIDR
curl -sfL https://get.k3s.io | sh -s - \
  --cluster-cidr 10.42.0.0/16 \
  --service-cidr 10.43.0.0/16
```

### Uninstall K3s (if needed)

K3s provides a clean uninstallation script:

```bash
# Uninstall K3s server (removes all cluster data)
/usr/local/bin/k3s-uninstall.sh

# For agent nodes, use this script instead
/usr/local/bin/k3s-agent-uninstall.sh
```

## Multi-Node Cluster Setup

For production edge deployments, you often need multiple nodes for high availability and workload distribution. K3s supports multi-node clusters with server (control plane) and agent (worker) nodes.

### Architecture Overview

A typical K3s multi-node cluster consists of:
- **Server nodes**: Run the control plane components (API server, scheduler, controller manager)
- **Agent nodes**: Run workloads (pods) and connect to the server

### Server Node Installation

Set up the first server node:

```bash
# On the first server node, install K3s with token generation
# The token is used for other nodes to join the cluster
curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --write-kubeconfig-mode 644 \
  --node-name k3s-server-1

# Retrieve the node token for joining other nodes
# This token must be securely shared with agent nodes
sudo cat /var/lib/rancher/k3s/server/node-token

# Example output: K10abc123def456::server:xyz789token
# Save this token - you will need it for agent nodes
```

### Retrieve Server Information

Get the information needed to join additional nodes:

```bash
# Get the server IP address
# Use the IP that is reachable from other nodes
hostname -I | awk '{print $1}'

# Or get the specific interface IP
ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1

# Get the node token
sudo cat /var/lib/rancher/k3s/server/node-token
```

### Agent Node Installation

Join agent (worker) nodes to the cluster:

```bash
# On each agent node, set the server URL and token
# Replace with your actual server IP and token
export K3S_URL="https://192.168.1.100:6443"
export K3S_TOKEN="K10abc123def456::server:xyz789token"

# Install K3s agent and join the cluster
curl -sfL https://get.k3s.io | sh -s - agent \
  --server $K3S_URL \
  --token $K3S_TOKEN \
  --node-name k3s-agent-1

# Alternatively, pass directly without environment variables
curl -sfL https://get.k3s.io | K3S_URL=https://192.168.1.100:6443 \
  K3S_TOKEN=K10abc123def456::server:xyz789token \
  sh -s - agent --node-name k3s-agent-2
```

### Verify Multi-Node Cluster

Check that all nodes have joined successfully:

```bash
# On the server node, list all cluster nodes
sudo kubectl get nodes -o wide

# Expected output shows server and agent nodes:
# NAME           STATUS   ROLES                  AGE   VERSION
# k3s-server-1   Ready    control-plane,master   5m    v1.28.4+k3s2
# k3s-agent-1    Ready    <none>                 2m    v1.28.4+k3s2
# k3s-agent-2    Ready    <none>                 1m    v1.28.4+k3s2

# Check system pods are distributed across nodes
sudo kubectl get pods -n kube-system -o wide
```

### Adding Labels to Nodes

Label nodes for workload placement:

```bash
# Label agent nodes for specific workload types
kubectl label nodes k3s-agent-1 node-role.kubernetes.io/worker=true
kubectl label nodes k3s-agent-1 workload-type=compute

# Label nodes by location for edge deployments
kubectl label nodes k3s-agent-1 topology.kubernetes.io/zone=edge-site-1
kubectl label nodes k3s-agent-2 topology.kubernetes.io/zone=edge-site-2

# Verify labels
kubectl get nodes --show-labels
```

### High Availability Server Setup

For production, run multiple server nodes for HA:

```bash
# On the first server, initialize with embedded etcd
curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --write-kubeconfig-mode 644 \
  --node-name k3s-server-1 \
  --tls-san 192.168.1.100 \
  --tls-san k3s.example.com

# On additional server nodes, join as servers (not agents)
# Use the same token from the first server
curl -sfL https://get.k3s.io | sh -s - server \
  --server https://192.168.1.100:6443 \
  --token $K3S_TOKEN \
  --node-name k3s-server-2 \
  --tls-san 192.168.1.101 \
  --tls-san k3s.example.com

# Add a third server for proper HA (odd number for etcd quorum)
curl -sfL https://get.k3s.io | sh -s - server \
  --server https://192.168.1.100:6443 \
  --token $K3S_TOKEN \
  --node-name k3s-server-3 \
  --tls-san 192.168.1.102 \
  --tls-san k3s.example.com
```

## Embedded etcd vs External Datastore

K3s supports multiple datastore backends. Understanding the options helps you choose the right one for your deployment.

### Default SQLite (Single Server)

By default, K3s uses SQLite for single-server deployments:

```bash
# Default installation uses SQLite
# Good for: Development, testing, single-node edge deployments
curl -sfL https://get.k3s.io | sh -

# SQLite database location
ls -la /var/lib/rancher/k3s/server/db/

# Check database file
sudo ls -lh /var/lib/rancher/k3s/server/db/state.db
```

### Embedded etcd (Multi-Server HA)

For high availability with multiple servers, use embedded etcd:

```bash
# Initialize cluster with embedded etcd on first server
curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --write-kubeconfig-mode 644

# Check etcd status
sudo kubectl get endpoints -n kube-system

# View etcd members
sudo k3s etcd-snapshot list

# Create manual etcd snapshot for backup
sudo k3s etcd-snapshot save --name manual-backup-$(date +%Y%m%d)

# List available snapshots
sudo ls -la /var/lib/rancher/k3s/server/db/snapshots/
```

### External MySQL/MariaDB Datastore

Connect K3s to an external MySQL or MariaDB database:

```bash
# First, create the database on your MySQL server
# mysql -u root -p
# CREATE DATABASE k3s;
# CREATE USER 'k3s'@'%' IDENTIFIED BY 'your-secure-password';
# GRANT ALL PRIVILEGES ON k3s.* TO 'k3s'@'%';
# FLUSH PRIVILEGES;

# Install K3s with MySQL datastore
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="mysql://k3s:your-secure-password@tcp(mysql.example.com:3306)/k3s"
```

### External PostgreSQL Datastore

Connect K3s to an external PostgreSQL database:

```bash
# First, create the database on your PostgreSQL server
# CREATE DATABASE k3s;
# CREATE USER k3s WITH ENCRYPTED PASSWORD 'your-secure-password';
# GRANT ALL PRIVILEGES ON DATABASE k3s TO k3s;

# Install K3s with PostgreSQL datastore
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="postgres://k3s:your-secure-password@postgres.example.com:5432/k3s"
```

### External etcd Cluster

Connect to an external etcd cluster:

```bash
# Install K3s with external etcd (requires etcd TLS certificates)
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="https://etcd1.example.com:2379,https://etcd2.example.com:2379,https://etcd3.example.com:2379" \
  --datastore-cafile=/path/to/ca.crt \
  --datastore-certfile=/path/to/client.crt \
  --datastore-keyfile=/path/to/client.key
```

### Datastore Comparison

| Datastore | Use Case | HA Support | Performance |
|-----------|----------|------------|-------------|
| SQLite | Single server, dev/test | No | Good for small clusters |
| Embedded etcd | Multi-server HA | Yes | Excellent |
| MySQL/MariaDB | External DB infrastructure | Yes | Good |
| PostgreSQL | External DB infrastructure | Yes | Good |
| External etcd | Existing etcd cluster | Yes | Excellent |

## Traefik Ingress Configuration

K3s includes Traefik as the default ingress controller. Here is how to configure and use it.

### Verify Traefik Installation

Check that Traefik is running:

```bash
# Check Traefik pod status
kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik

# View Traefik service (LoadBalancer type by default)
kubectl get svc -n kube-system traefik

# Check Traefik logs
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik
```

### Create an Ingress Resource

Deploy a sample application with ingress:

```yaml
# Save as sample-app.yaml
# This deploys a simple nginx application with ingress
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-demo
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-demo
  template:
    metadata:
      labels:
        app: nginx-demo
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          limits:
            memory: "64Mi"
            cpu: "100m"
          requests:
            memory: "32Mi"
            cpu: "50m"
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-demo
  namespace: default
spec:
  selector:
    app: nginx-demo
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-demo
  namespace: default
  annotations:
    # Traefik-specific annotations
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
  - host: demo.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-demo
            port:
              number: 80
```

Apply the configuration:

```bash
# Apply the sample application
kubectl apply -f sample-app.yaml

# Verify deployment
kubectl get pods,svc,ingress

# Test ingress (add demo.example.com to /etc/hosts pointing to node IP)
curl -H "Host: demo.example.com" http://<node-ip>
```

### Enable HTTPS with TLS

Configure TLS for your ingress:

```yaml
# Save as tls-ingress.yaml
# This configures HTTPS with a TLS certificate
---
apiVersion: v1
kind: Secret
metadata:
  name: demo-tls
  namespace: default
type: kubernetes.io/tls
data:
  # Base64 encoded TLS certificate
  tls.crt: <base64-encoded-certificate>
  # Base64 encoded private key
  tls.key: <base64-encoded-key>
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-demo-tls
  namespace: default
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
spec:
  tls:
  - hosts:
    - demo.example.com
    secretName: demo-tls
  rules:
  - host: demo.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-demo
            port:
              number: 80
```

### Custom Traefik Configuration

Customize Traefik using HelmChartConfig:

```yaml
# Save as /var/lib/rancher/k3s/server/manifests/traefik-config.yaml
# This customizes the Traefik deployment
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |-
    # Enable access logs
    logs:
      access:
        enabled: true
    # Configure additional entry points
    ports:
      web:
        redirectTo: websecure
      websecure:
        tls:
          enabled: true
    # Set resource limits
    resources:
      limits:
        cpu: "300m"
        memory: "150Mi"
      requests:
        cpu: "100m"
        memory: "50Mi"
    # Enable Traefik dashboard (for debugging)
    dashboard:
      enabled: true
```

### Disable Traefik (Use Alternative Ingress)

If you prefer a different ingress controller:

```bash
# Install K3s without Traefik
curl -sfL https://get.k3s.io | sh -s - --disable traefik

# Then install your preferred ingress controller
# Example: Install nginx-ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
```

## Local Storage Provisioner

K3s includes the local-path-provisioner for persistent storage. Here is how to use and configure it.

### Verify Local Path Provisioner

Check the default storage class:

```bash
# List available storage classes
kubectl get storageclass

# The default local-path storage class should be shown
# NAME                   PROVISIONER             RECLAIMPOLICY
# local-path (default)   rancher.io/local-path   Delete

# Check local-path-provisioner pod
kubectl get pods -n kube-system -l app=local-path-provisioner
```

### Create a Persistent Volume Claim

Request storage for your application:

```yaml
# Save as pvc-demo.yaml
# This creates a PVC using the local-path provisioner
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: local-pvc-demo
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: volume-test
  namespace: default
spec:
  containers:
  - name: volume-test
    image: nginx:alpine
    volumeMounts:
    - name: data
      mountPath: /data
    command: ["/bin/sh"]
    args: ["-c", "while true; do echo $(date) >> /data/log.txt; sleep 60; done"]
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: local-pvc-demo
```

Apply and verify:

```bash
# Create the PVC and test pod
kubectl apply -f pvc-demo.yaml

# Check PVC status (should be Bound)
kubectl get pvc local-pvc-demo

# Check the test pod
kubectl get pod volume-test

# Verify data is being written
kubectl exec volume-test -- cat /data/log.txt

# Check where data is stored on the node
sudo ls -la /var/lib/rancher/k3s/storage/
```

### Custom Storage Configuration

Customize the local-path-provisioner:

```yaml
# Save as /var/lib/rancher/k3s/server/manifests/local-storage-config.yaml
# This creates a custom storage class with different settings
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path-retain
provisioner: rancher.io/local-path
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
parameters:
  nodePath: /mnt/data/k3s-storage
```

Configure custom storage paths:

```bash
# Create custom storage directory on each node
sudo mkdir -p /mnt/data/k3s-storage
sudo chmod 777 /mnt/data/k3s-storage

# Update local-path-provisioner config
kubectl get configmap local-path-config -n kube-system -o yaml
```

### StatefulSet with Local Storage

Deploy a StatefulSet using local storage:

```yaml
# Save as statefulset-demo.yaml
# This demonstrates StatefulSet with persistent storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
  namespace: default
spec:
  serviceName: "nginx"
  replicas: 3
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
        image: nginx:alpine
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: local-path
      resources:
        requests:
          storage: 500Mi
```

## Air-Gapped Installation

For environments without internet access, K3s supports air-gapped installation.

### Download Required Files

On a machine with internet access, download K3s components:

```bash
# Create a directory for air-gap files
mkdir k3s-airgap && cd k3s-airgap

# Download K3s binary (adjust version as needed)
export K3S_VERSION="v1.28.4+k3s2"
wget https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/k3s

# Download the installation script
curl -sfL https://get.k3s.io > install.sh

# Download air-gap images tarball
wget https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/k3s-airgap-images-amd64.tar.gz

# For ARM64 systems, use this instead
# wget https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/k3s-airgap-images-arm64.tar.gz

# Download checksums for verification
wget https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/sha256sum-amd64.txt

# Verify downloads
sha256sum -c sha256sum-amd64.txt --ignore-missing

# List the downloaded files
ls -la
```

### Transfer Files to Air-Gapped System

Copy files to your air-gapped Ubuntu system:

```bash
# Use USB drive, SCP, or other transfer method
# Example using SCP (from internet-connected machine):
scp -r k3s-airgap/ user@air-gapped-host:/tmp/

# Alternatively, copy to USB drive
cp -r k3s-airgap/ /media/usb-drive/
```

### Install on Air-Gapped System

On the air-gapped Ubuntu system:

```bash
# Navigate to the copied files
cd /tmp/k3s-airgap/

# Create the images directory
sudo mkdir -p /var/lib/rancher/k3s/agent/images/

# Copy the images tarball to the correct location
sudo cp k3s-airgap-images-amd64.tar.gz /var/lib/rancher/k3s/agent/images/

# Make the K3s binary executable and move to proper location
chmod +x k3s
sudo cp k3s /usr/local/bin/

# Set environment variable to skip download
export INSTALL_K3S_SKIP_DOWNLOAD=true

# Make install script executable and run
chmod +x install.sh
sudo ./install.sh

# Verify installation
sudo systemctl status k3s
sudo kubectl get nodes
```

### Air-Gapped Multi-Node Setup

For multi-node air-gapped clusters:

```bash
# On air-gapped server node
export INSTALL_K3S_SKIP_DOWNLOAD=true
sudo ./install.sh server --cluster-init

# Get the node token
sudo cat /var/lib/rancher/k3s/server/node-token

# On air-gapped agent nodes (after copying files)
export INSTALL_K3S_SKIP_DOWNLOAD=true
export K3S_URL="https://<server-ip>:6443"
export K3S_TOKEN="<node-token>"
sudo ./install.sh agent
```

### Private Registry for Air-Gapped Environments

Configure K3s to use a private registry:

```yaml
# Create registry configuration
# Save as /etc/rancher/k3s/registries.yaml
mirrors:
  docker.io:
    endpoint:
      - "https://registry.example.com"
  gcr.io:
    endpoint:
      - "https://registry.example.com"
configs:
  "registry.example.com":
    auth:
      username: admin
      password: your-registry-password
    tls:
      # For self-signed certificates
      insecure_skip_verify: true
      # Or provide CA certificate
      # ca_file: /etc/rancher/k3s/registry-ca.crt
```

Restart K3s to apply registry configuration:

```bash
# Restart K3s to load registry configuration
sudo systemctl restart k3s

# Verify registry configuration
sudo cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml | grep -A5 registry
```

### Importing Additional Images

Import custom images for air-gapped deployments:

```bash
# On internet-connected machine, save images
docker pull myapp:v1.0
docker save myapp:v1.0 -o myapp-v1.0.tar

# Transfer to air-gapped system and import
sudo k3s ctr images import myapp-v1.0.tar

# Verify image is available
sudo k3s ctr images list | grep myapp

# Alternative: Import directly to containerd
sudo ctr -n k8s.io images import myapp-v1.0.tar
```

## Verification and Troubleshooting

After installation, verify your K3s cluster is functioning correctly and learn how to troubleshoot common issues.

### Cluster Health Checks

Perform comprehensive cluster health verification:

```bash
# Check node status and details
kubectl get nodes -o wide
kubectl describe nodes

# Verify all system pods are running
kubectl get pods -n kube-system -o wide

# Check cluster component status
kubectl get componentstatuses

# Verify cluster info
kubectl cluster-info

# Check K3s version
k3s --version
kubectl version --short
```

### Check K3s Logs

View logs for troubleshooting:

```bash
# View K3s server logs
sudo journalctl -u k3s -f

# View K3s agent logs (on agent nodes)
sudo journalctl -u k3s-agent -f

# View logs for specific time range
sudo journalctl -u k3s --since "1 hour ago"

# Check containerd logs
sudo journalctl -u containerd -f

# View logs for specific pods
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik
```

### Common Issues and Solutions

Address frequently encountered problems:

```bash
# Issue: Node shows NotReady status
# Check kubelet logs
sudo journalctl -u k3s | grep -i error

# Check if required ports are open
sudo ss -tulpn | grep -E '6443|10250|8472'

# Issue: Pods stuck in Pending state
# Check events for the pod
kubectl describe pod <pod-name>

# Check available resources
kubectl describe nodes | grep -A5 "Allocated resources"

# Issue: CoreDNS not resolving
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns

# Test DNS resolution
kubectl run test-dns --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default

# Issue: Cannot pull images
# Check containerd is running
sudo systemctl status containerd

# Check image pull manually
sudo k3s ctr images pull docker.io/library/nginx:alpine
```

### Reset and Reinstall

If needed, completely reset K3s:

```bash
# Stop K3s service
sudo systemctl stop k3s

# Run the uninstall script
sudo /usr/local/bin/k3s-uninstall.sh

# Clean up remaining files (optional)
sudo rm -rf /var/lib/rancher/k3s
sudo rm -rf /etc/rancher/k3s
sudo rm -rf ~/.kube

# Reinstall fresh
curl -sfL https://get.k3s.io | sh -
```

### Backup and Restore

Protect your cluster data:

```bash
# Create etcd snapshot (for embedded etcd)
sudo k3s etcd-snapshot save --name backup-$(date +%Y%m%d-%H%M%S)

# List available snapshots
sudo k3s etcd-snapshot list

# Restore from snapshot (stops K3s and restores data)
sudo systemctl stop k3s
sudo k3s server \
  --cluster-reset \
  --cluster-reset-restore-path=/var/lib/rancher/k3s/server/db/snapshots/<snapshot-name>

# For SQLite, backup the database file
sudo cp /var/lib/rancher/k3s/server/db/state.db /backup/k3s-state-$(date +%Y%m%d).db
```

### Performance Monitoring

Monitor cluster performance:

```bash
# Check node resource usage
kubectl top nodes

# Check pod resource usage
kubectl top pods -A

# Enable metrics server if not installed
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# For K3s, you might need to add kubelet-insecure-tls
kubectl patch deployment metrics-server -n kube-system \
  --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'
```

## Conclusion

K3s provides a lightweight, production-ready Kubernetes distribution perfect for edge computing, IoT deployments, and resource-constrained environments. In this guide, you learned how to:

1. **Understand K3s vs K8s**: K3s offers a significantly smaller footprint while maintaining Kubernetes compatibility, making it ideal for edge scenarios.

2. **Install K3s on a single node**: Quick installation using the official script with various customization options.

3. **Set up multi-node clusters**: Configure server and agent nodes for distributed workloads with high availability options.

4. **Choose the right datastore**: Select between SQLite, embedded etcd, or external databases based on your requirements.

5. **Configure Traefik ingress**: Utilize the built-in ingress controller for routing external traffic to your services.

6. **Manage persistent storage**: Use the local-path-provisioner for persistent volumes in edge deployments.

7. **Perform air-gapped installations**: Deploy K3s in environments without internet access using pre-downloaded binaries and images.

K3s excels in edge computing scenarios where you need Kubernetes capabilities without the overhead of a full cluster. Its single binary design, reduced memory footprint, and simplified operations make it the go-to choice for edge Kubernetes deployments.

For production deployments, consider implementing proper monitoring with tools like OneUptime to ensure your edge clusters remain healthy and performant. Monitoring edge nodes is crucial as they often operate in remote locations with limited physical access.

## Additional Resources

- [K3s Official Documentation](https://docs.k3s.io/)
- [K3s GitHub Repository](https://github.com/k3s-io/k3s)
- [Rancher K3s Docs](https://rancher.com/docs/k3s/latest/en/)
- [CNCF K3s Landscape](https://landscape.cncf.io/)

Start your edge Kubernetes journey with K3s today and experience the power of lightweight container orchestration.
