# How to Install K3s on Raspberry Pi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, K3s, Raspberry Pi, ARM, Edge Computing, Home Lab, IoT, Self-Hosting

Description: A complete guide to installing K3s on Raspberry Pi, from hardware preparation to cluster optimization. Learn how to build a lightweight, production-ready Kubernetes cluster on ARM devices.

---

> K3s on Raspberry Pi transforms a handful of credit-card-sized computers into a fully functional Kubernetes cluster. It is the perfect blend of learning, experimentation, and real-world edge computing.

Raspberry Pi devices have evolved from educational toys into legitimate computing platforms. Combined with K3s, a lightweight Kubernetes distribution, you can build a home lab cluster for pennies on the dollar compared to cloud alternatives. Whether you want to learn Kubernetes, run home automation, or deploy edge workloads, this guide walks you through every step.

If you are new to Kubernetes distributions and want to understand where K3s fits, read [Choosing the Right Kubernetes Distribution](https://oneuptime.com/blog/post/2025-11-27-choosing-the-right-kubernetes-distribution/view) first.

## Hardware Requirements

Before diving into installation, ensure you have the right hardware. K3s is lightweight, but the Raspberry Pi still has physical limitations.

### Minimum Setup (Single Node)

| Component | Requirement | Recommendation |
| --- | --- | --- |
| Raspberry Pi | Pi 4 (2GB RAM) | Pi 4 (4GB or 8GB RAM) |
| Storage | 16GB microSD | 32GB+ microSD (A2 rated) or SSD via USB 3.0 |
| Power Supply | 5V 3A USB-C | Official Raspberry Pi PSU |
| Networking | Ethernet or WiFi | Gigabit Ethernet strongly preferred |
| Cooling | Passive heatsink | Active cooling for sustained loads |

### Recommended Cluster Setup

For a proper cluster experience, plan for at least three nodes:

```mermaid
flowchart TB
    subgraph Network
        Router[Home Router / Switch]
    end

    subgraph Cluster["K3s Cluster"]
        Master[Pi 4 - 4GB<br/>Control Plane]
        Worker1[Pi 4 - 4GB<br/>Worker Node 1]
        Worker2[Pi 4 - 4GB<br/>Worker Node 2]
    end

    Router --> Master
    Router --> Worker1
    Router --> Worker2
    Master -.->|K3s Agent| Worker1
    Master -.->|K3s Agent| Worker2
```

### Shopping List for a Three-Node Cluster

```bash
# Essential components for a 3-node cluster
# ==========================================

# Raspberry Pi 4 (4GB recommended) x3
# - 4GB gives breathing room for workloads
# - 8GB if you plan to run databases or heavy apps

# microSD cards (32GB A2 rated) x3
# - A2 rating ensures faster random I/O
# - Consider SSD boot for production workloads

# USB-C power supplies (5V 3A) x3
# - Underpowered supplies cause random crashes
# - Use official or certified PSUs only

# Ethernet cables (Cat6) x3
# - Gigabit network is essential for cluster traffic
# - Avoid WiFi for control plane communication

# Cluster case or rack (optional)
# - Keeps cables organized
# - Improves airflow for cooling

# Network switch (optional)
# - 5-port gigabit switch if router ports are limited
```

## OS Preparation

K3s runs on most Linux distributions, but for Raspberry Pi, we recommend Raspberry Pi OS Lite (64-bit) or Ubuntu Server for ARM.

### Step 1: Flash the Operating System

Download and flash the OS using Raspberry Pi Imager:

```bash
# Download Raspberry Pi Imager from:
# https://www.raspberrypi.com/software/

# Or install via command line on macOS:
brew install raspberry-pi-imager

# On Ubuntu/Debian:
sudo apt install rpi-imager
```

When using the Imager, configure these settings before flashing:

```bash
# In Raspberry Pi Imager Advanced Options (Ctrl+Shift+X):
# ========================================================

# 1. Set hostname (unique per node)
#    - pi-master for control plane
#    - pi-worker-1, pi-worker-2 for workers

# 2. Enable SSH with password or key authentication
#    - Key-based auth recommended for security

# 3. Set username and password
#    - Default 'pi' user is deprecated
#    - Create a custom user like 'k3s-admin'

# 4. Configure WiFi (if not using Ethernet)
#    - Enter SSID and password
#    - Set country code for regulatory compliance

# 5. Set locale and timezone
#    - Ensures accurate timestamps in logs
```

### Step 2: Initial System Configuration

After booting each Pi, SSH in and perform initial setup:

```bash
# SSH into your Pi (replace with your hostname or IP)
ssh k3s-admin@pi-master.local

# Update the system packages
# This ensures you have the latest security patches
sudo apt update && sudo apt upgrade -y

# Set a static IP address for cluster stability
# Edit the dhcpcd configuration file
sudo nano /etc/dhcpcd.conf

# Add these lines at the end (adjust for your network):
# =====================================================
# interface eth0
# static ip_address=192.168.1.100/24    # Master node
# static routers=192.168.1.1            # Your router IP
# static domain_name_servers=192.168.1.1 8.8.8.8

# For worker nodes, use different IPs:
# Worker 1: 192.168.1.101/24
# Worker 2: 192.168.1.102/24

# Reboot to apply network changes
sudo reboot
```

### Step 3: Configure cgroups for Kubernetes

Kubernetes requires certain cgroup features enabled. On Raspberry Pi OS, you need to enable them manually:

```bash
# Edit the boot configuration
sudo nano /boot/firmware/cmdline.txt

# Add these parameters to the END of the existing line
# (Keep everything on ONE line, space-separated):
# cgroup_memory=1 cgroup_enable=memory

# Example of the complete line:
# console=serial0,115200 console=tty1 root=PARTUUID=xxx rootfstype=ext4 fsck.repair=yes rootwait cgroup_memory=1 cgroup_enable=memory

# Reboot to apply cgroup changes
sudo reboot

# Verify cgroups are enabled after reboot
cat /proc/cgroups | grep memory
# Should show: memory  0  XX  1 (last column should be 1)
```

### Step 4: Disable Swap (Kubernetes Requirement)

Kubernetes does not play well with swap. Disable it permanently:

```bash
# Turn off swap immediately
sudo swapoff -a

# Disable swap permanently by commenting out swap entries
sudo nano /etc/fstab
# Comment out any line containing 'swap' by adding # at the start

# Alternatively, disable the swap service entirely
sudo systemctl disable dphys-swapfile.service
sudo systemctl stop dphys-swapfile.service

# Remove the swap file to reclaim space
sudo rm /var/swap

# Verify swap is disabled
free -h
# Swap line should show 0B for total, used, and free
```

## K3s Installation on ARM

K3s installation is remarkably simple. Rancher provides a single script that handles everything.

### Installing the Control Plane (Master Node)

```bash
# SSH into your master node
ssh k3s-admin@192.168.1.100

# Install K3s as a server (control plane)
# =======================================
# This single command:
# - Downloads the K3s binary
# - Installs it as a systemd service
# - Starts the control plane components
# - Generates TLS certificates
# - Creates the kubeconfig file

curl -sfL https://get.k3s.io | sh -

# The installation takes 1-2 minutes on a Pi 4

# Verify the installation succeeded
sudo systemctl status k3s
# Should show: active (running)

# Check that the node is ready
sudo k3s kubectl get nodes
# Output:
# NAME        STATUS   ROLES                  AGE   VERSION
# pi-master   Ready    control-plane,master   1m    v1.28.x+k3s1

# Retrieve the node token for joining workers
# This token is required for worker nodes to authenticate
sudo cat /var/lib/rancher/k3s/server/node-token
# Save this token securely - you will need it for worker nodes
```

### Understanding K3s Installation Options

K3s supports many configuration flags. Here are the most useful ones for Raspberry Pi:

```bash
# Install with custom options using environment variables
# ======================================================

# Example: Disable Traefik if you prefer nginx-ingress
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik" sh -

# Example: Use a specific K3s version
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="v1.28.5+k3s1" sh -

# Example: Bind to a specific network interface
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--bind-address 192.168.1.100 --advertise-address 192.168.1.100" sh -

# Example: Use external database instead of embedded etcd
# (Useful for HA setups with external PostgreSQL/MySQL)
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--datastore-endpoint='postgres://user:pass@host:5432/k3s'" sh -

# Common flags for resource-constrained Pi:
# --disable servicelb     # Disable built-in load balancer
# --disable traefik       # Disable built-in ingress
# --disable local-storage # Disable local path provisioner
# --kubelet-arg="max-pods=50" # Limit pods per node
```

## Adding Worker Nodes

With the control plane running, add worker nodes to distribute workloads.

### Join Workers to the Cluster

```bash
# SSH into your first worker node
ssh k3s-admin@192.168.1.101

# Set environment variables for the join command
# Replace with your actual master IP and token
K3S_MASTER_IP="192.168.1.100"
K3S_TOKEN="K10xxxxxxxxxxxxxxxxxxxxxxxxxxxxx::server:xxxxxxxxxxxxx"

# Install K3s as an agent (worker node)
# =====================================
# The K3S_URL tells the agent where to find the control plane
# The K3S_TOKEN authenticates the node to join the cluster

curl -sfL https://get.k3s.io | K3S_URL=https://${K3S_MASTER_IP}:6443 K3S_TOKEN=${K3S_TOKEN} sh -

# Verify the agent is running
sudo systemctl status k3s-agent
# Should show: active (running)

# Repeat for additional worker nodes (192.168.1.102, etc.)
```

### Verify the Cluster

Back on the master node, verify all nodes have joined:

```bash
# On the master node, check cluster membership
sudo k3s kubectl get nodes -o wide

# Expected output:
# NAME          STATUS   ROLES                  AGE   VERSION        INTERNAL-IP     OS-IMAGE
# pi-master     Ready    control-plane,master   10m   v1.28.x+k3s1   192.168.1.100   Debian GNU/Linux 12
# pi-worker-1   Ready    <none>                 2m    v1.28.x+k3s1   192.168.1.101   Debian GNU/Linux 12
# pi-worker-2   Ready    <none>                 1m    v1.28.x+k3s1   192.168.1.102   Debian GNU/Linux 12

# Label worker nodes for easier scheduling
sudo k3s kubectl label node pi-worker-1 node-role.kubernetes.io/worker=worker
sudo k3s kubectl label node pi-worker-2 node-role.kubernetes.io/worker=worker

# Check nodes with labels
sudo k3s kubectl get nodes
# Now shows 'worker' in the ROLES column for worker nodes
```

### Cluster Architecture Overview

```mermaid
flowchart TB
    subgraph ControlPlane["Control Plane (pi-master)"]
        API[API Server]
        Scheduler[Scheduler]
        Controller[Controller Manager]
        SQLite[(SQLite/etcd)]
    end

    subgraph Worker1["Worker Node (pi-worker-1)"]
        Kubelet1[Kubelet]
        Containerd1[containerd]
        Pod1[Pods]
    end

    subgraph Worker2["Worker Node (pi-worker-2)"]
        Kubelet2[Kubelet]
        Containerd2[containerd]
        Pod2[Pods]
    end

    API --> Kubelet1
    API --> Kubelet2
    Scheduler --> API
    Controller --> API
    API --> SQLite
    Kubelet1 --> Containerd1
    Kubelet2 --> Containerd2
    Containerd1 --> Pod1
    Containerd2 --> Pod2
```

## Resource Optimization for Pi

Raspberry Pi has limited resources. These optimizations help K3s run efficiently.

### Memory Optimization

```bash
# Check current memory usage
free -h

# K3s server typically uses 500-800MB RAM
# K3s agent uses 200-400MB RAM

# Reduce kubelet memory if needed
# Edit the K3s service configuration
sudo nano /etc/systemd/system/k3s.service

# Add memory limits to ExecStart:
# --kubelet-arg="system-reserved=memory=200Mi"
# --kubelet-arg="kube-reserved=memory=200Mi"

# Reload and restart K3s
sudo systemctl daemon-reload
sudo systemctl restart k3s
```

### CPU Optimization

```bash
# Monitor CPU usage
htop

# K3s is optimized for ARM, but you can further tune it:

# Reduce API server request limits
sudo nano /etc/rancher/k3s/config.yaml

# Add these configurations:
# ========================
# kube-apiserver-arg:
#   - "max-requests-inflight=100"
#   - "max-mutating-requests-inflight=50"
# kubelet-arg:
#   - "max-pods=30"
#   - "pods-per-core=10"

# Restart K3s to apply changes
sudo systemctl restart k3s
```

### Storage Optimization

```bash
# For better performance, use an SSD instead of microSD
# =====================================================

# Check if USB SSD is detected
lsblk

# Benchmark your current storage
sudo apt install hdparm
sudo hdparm -Tt /dev/mmcblk0  # microSD
sudo hdparm -Tt /dev/sda      # USB SSD (if connected)

# Typical results:
# microSD: ~40 MB/s sequential, ~2000 IOPS random
# USB SSD: ~300 MB/s sequential, ~30000 IOPS random

# To boot from SSD:
# 1. Update firmware: sudo rpi-update
# 2. Enable USB boot: sudo raspi-config -> Advanced -> Boot Order
# 3. Clone SD to SSD: Use rpi-imager or dd
# 4. Remove SD card and boot from SSD

# Use local-path-provisioner for persistent volumes
# K3s includes this by default at /var/lib/rancher/k3s/storage
```

### Network Optimization

```bash
# Enable BBR congestion control for better network performance
# ===========================================================

# Check current congestion control algorithm
sysctl net.ipv4.tcp_congestion_control
# Default is usually 'cubic'

# Enable BBR (better for variable network conditions)
sudo nano /etc/sysctl.d/99-k3s-network.conf

# Add these lines:
# net.core.default_qdisc=fq
# net.ipv4.tcp_congestion_control=bbr
# net.ipv4.ip_forward=1

# Apply changes
sudo sysctl --system

# Verify BBR is active
sysctl net.ipv4.tcp_congestion_control
# Should show: net.ipv4.tcp_congestion_control = bbr
```

### K3s-Specific Optimizations

```yaml
# /etc/rancher/k3s/config.yaml
# ============================
# This file configures K3s server options
# Create it if it does not exist

# Disable components you do not need
disable:
  - traefik          # Use nginx-ingress or skip if not needed
  - servicelb        # Use MetalLB instead for bare metal
  - local-storage    # Only if using external storage

# Kubelet optimizations for constrained resources
kubelet-arg:
  - "max-pods=50"                    # Limit pods per node
  - "eviction-hard=memory.available<100Mi"  # Evict pods when memory is low
  - "eviction-soft=memory.available<200Mi"
  - "eviction-soft-grace-period=memory.available=30s"
  - "system-reserved=cpu=100m,memory=100Mi"
  - "kube-reserved=cpu=100m,memory=200Mi"

# etcd optimization (if using embedded etcd)
# Use SQLite for single-node, etcd for multi-master
# K3s defaults to SQLite which is lighter for Pi
```

### Resource Limits for Workloads

```yaml
# example-deployment.yaml
# =======================
# Always set resource requests and limits on Pi clusters
# This prevents any single pod from starving the node

apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-example
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
        image: nginx:alpine  # Use alpine images - much smaller
        resources:
          requests:
            memory: "64Mi"   # Minimum memory guaranteed
            cpu: "50m"       # 50 millicores (5% of one core)
          limits:
            memory: "128Mi"  # Maximum memory allowed
            cpu: "100m"      # Maximum CPU allowed
        ports:
        - containerPort: 80
      # Spread pods across nodes for resilience
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - nginx
              topologyKey: kubernetes.io/hostname
```

## Accessing Your Cluster Remotely

Configure kubectl on your workstation to manage the cluster remotely.

```bash
# On the master node, display the kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml

# Copy this content to your local machine
# On your workstation:
mkdir -p ~/.kube
nano ~/.kube/config

# Paste the kubeconfig content
# IMPORTANT: Replace 'server: https://127.0.0.1:6443' with
# 'server: https://192.168.1.100:6443' (your master's IP)

# Test the connection
kubectl get nodes

# Alternative: Use the KUBECONFIG environment variable
export KUBECONFIG=~/.kube/pi-cluster-config
kubectl get nodes
```

## Monitoring Your Pi Cluster

```mermaid
flowchart LR
    subgraph PiCluster["K3s Pi Cluster"]
        Node1[pi-master]
        Node2[pi-worker-1]
        Node3[pi-worker-2]
    end

    subgraph Monitoring["Monitoring Stack"]
        OTel[OpenTelemetry Collector]
        OneUptime[OneUptime]
    end

    Node1 -->|metrics/logs| OTel
    Node2 -->|metrics/logs| OTel
    Node3 -->|metrics/logs| OTel
    OTel -->|export| OneUptime
```

For monitoring your K3s cluster, deploy the OpenTelemetry Collector to gather metrics, logs, and traces. Send them to [OneUptime](https://oneuptime.com) for visualization, alerting, and incident management.

```bash
# Deploy a lightweight monitoring stack
# Use the OneUptime Helm chart for easy setup
helm repo add oneuptime https://helm.oneuptime.com
helm install oneuptime-agent oneuptime/oneuptime-agent \
  --set apiKey=YOUR_API_KEY \
  --set endpoint=https://oneuptime.com
```

## Best Practices Summary

Running K3s on Raspberry Pi is rewarding but requires attention to the platform's constraints. Follow these guidelines for a stable cluster:

**Hardware Best Practices**

- Use Raspberry Pi 4 with at least 4GB RAM for control plane nodes
- Boot from USB SSD instead of microSD for production workloads
- Use quality power supplies rated at 5V 3A minimum
- Connect via Gigabit Ethernet, not WiFi, for cluster traffic
- Implement active cooling for sustained workloads

**Installation Best Practices**

- Enable cgroups for memory before installing K3s
- Disable swap permanently on all nodes
- Use static IP addresses for all cluster nodes
- Document your node token securely
- Start with a single master before adding workers

**Resource Management Best Practices**

- Always set resource requests and limits on deployments
- Use alpine-based container images when possible
- Disable unused K3s components (Traefik, ServiceLB) to save resources
- Limit max pods per node based on available memory
- Configure eviction thresholds to prevent node instability

**Operational Best Practices**

- Back up `/var/lib/rancher/k3s/server/` directory regularly
- Monitor node resources with lightweight tools like htop or k9s
- Use node affinity to spread workloads across the cluster
- Keep K3s updated with `curl -sfL https://get.k3s.io | sh -`
- Label nodes for easier workload scheduling

**Networking Best Practices**

- Use Flannel (K3s default) for simplicity, or Calico for network policies
- Consider MetalLB for bare-metal load balancing
- Enable BBR TCP congestion control for better throughput
- Assign dedicated VLANs for cluster traffic in complex networks

## Troubleshooting Common Issues

```bash
# K3s service fails to start
# ==========================
# Check the service logs for errors
sudo journalctl -u k3s -f

# Common fixes:
# - Ensure cgroups are enabled: cat /proc/cgroups
# - Verify swap is disabled: free -h
# - Check available disk space: df -h

# Worker node cannot join cluster
# ===============================
# Verify network connectivity
ping 192.168.1.100  # Master IP

# Check if the token is correct
sudo cat /var/lib/rancher/k3s/server/node-token

# Verify port 6443 is accessible
nc -zv 192.168.1.100 6443

# Pods stuck in Pending state
# ===========================
# Check for resource constraints
kubectl describe pod <pod-name>

# Look for events showing insufficient CPU or memory
# Reduce resource requests or add more nodes

# High memory usage / OOMKilled pods
# ==================================
# Check memory pressure
kubectl top nodes
kubectl top pods

# Lower resource limits or add nodes
# Consider using swap (not recommended) as last resort
```

## Next Steps

With your K3s cluster running on Raspberry Pi, you have a powerful platform for learning and experimentation. Consider exploring:

- [Kubernetes Network Policies for Zero Trust](https://oneuptime.com/blog/post/2026-01-06-kubernetes-network-policies-zero-trust/view) to secure pod-to-pod communication
- [GitOps with ArgoCD](https://oneuptime.com/blog/post/2026-01-06-kubernetes-gitops-argocd/view) for declarative deployments
- [Horizontal Pod Autoscaling](https://oneuptime.com/blog/post/2025-11-27-hpa-autoscale/view) to handle variable loads

Your Raspberry Pi cluster is now ready to run real workloads. Start small, monitor resource usage, and scale up as needed. Happy clustering.

---

*Monitor your K3s cluster with [OneUptime](https://oneuptime.com) - open-source observability for Kubernetes, with logs, metrics, traces, and alerting in one platform.*
