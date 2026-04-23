# How to Install RKE2 on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Ubuntu, Installation, Rancher

Description: A step-by-step guide to installing RKE2 (Rancher Kubernetes Engine 2) on Ubuntu Linux for a production-ready Kubernetes cluster.

RKE2 is Rancher's next-generation Kubernetes distribution that focuses on security and compliance. It bundles a hardened Kubernetes cluster with all required components, making it an excellent choice for organizations that need a secure, production-ready Kubernetes distribution. This guide covers installing RKE2 on Ubuntu 20.04 with Ubuntu Pro/ESM enabled and Ubuntu 22.04.

## Prerequisites

- Ubuntu 20.04 LTS with Ubuntu Pro/ESM enabled, or Ubuntu 22.04 LTS
- Minimum 2 vCPUs and 4 GB RAM per node
- Root or sudo access
- AppArmor tools available if AppArmor is enabled
- Ports 6443 and 9345 open from cluster nodes to control plane nodes
- Ports 2379-2381 open between control plane nodes
- Port 10250 open between all nodes
- CNI-specific ports open between nodes (for the default Canal CNI: UDP 8472 and TCP 9099)

## Step 1: Prepare the System

```bash
# Update system packages

sudo apt-get update && sudo apt-get upgrade -y

# Disable swap unless you have explicitly configured Kubernetes swap support
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Verify swap is disabled
free -h

# Load required kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter

# Persist kernel module loading
cat <<EOF | sudo tee /etc/modules-load.d/rke2.conf
overlay
br_netfilter
EOF

# Configure kernel parameters for Kubernetes
cat <<EOF | sudo tee /etc/sysctl.d/99-rke2.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# Apply sysctl parameters
sudo sysctl --system
```

## Step 2: Configure Firewall

```bash
# If using UFW, allow required ports from your private RKE2 node subnets.
# Replace these placeholders before running the commands.
NODE_CIDR="<PRIVATE_NODE_CIDR>"          # Example: 10.0.0.0/24
SERVER_CIDR="<PRIVATE_SERVER_NODE_CIDR>" # Example: 10.0.0.0/28

sudo ufw allow 22/tcp
sudo ufw allow from "$NODE_CIDR" to any port 6443 proto tcp        # Kubernetes API server
sudo ufw allow from "$NODE_CIDR" to any port 9345 proto tcp        # RKE2 supervisor API
sudo ufw allow from "$SERVER_CIDR" to any port 2379:2381 proto tcp # etcd client, peer, and metrics
sudo ufw allow from "$NODE_CIDR" to any port 10250 proto tcp       # Kubelet metrics

# Default Canal CNI
sudo ufw allow from "$NODE_CIDR" to any port 8472 proto udp        # Canal VXLAN
sudo ufw allow from "$NODE_CIDR" to any port 9099 proto tcp        # Canal health checks

# Optional ports, enable only when used
sudo ufw allow from "$NODE_CIDR" to any port 4789 proto udp        # Calico/Flannel VXLAN
sudo ufw allow from "$NODE_CIDR" to any port 51820 proto udp       # Canal WireGuard IPv4
sudo ufw allow from "$NODE_CIDR" to any port 51821 proto udp       # Canal WireGuard IPv6/dual-stack
sudo ufw allow from "$NODE_CIDR" to any port 30000:32767 proto tcp # NodePort services
```

## Step 3: Install RKE2 Server (Control Plane)

```bash
# Download and run the RKE2 installation script
# This installs the latest stable RKE2 release
curl -sfL https://get.rke2.io | sudo sh -

# Enable and start RKE2 server
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service

# Monitor the installation progress
sudo journalctl -u rke2-server -f

# Wait for RKE2 to be ready (may take a few minutes)
sudo /var/lib/rancher/rke2/bin/kubectl \
  --kubeconfig /etc/rancher/rke2/rke2.yaml \
  get nodes
```

## Step 4: Configure kubectl Access

```bash
# Add RKE2 binaries to PATH
echo 'export PATH=$PATH:/var/lib/rancher/rke2/bin' >> ~/.bashrc
source ~/.bashrc

# Set up kubeconfig for the current user
mkdir -p ~/.kube
sudo cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Verify cluster access
kubectl get nodes
kubectl get pods -A
```

## Step 5: Get the Token for Agent Nodes

```bash
# Get the token needed to join agent nodes
sudo cat /var/lib/rancher/rke2/server/node-token

# Note the server IP for agent configuration
hostname -I | awk '{print $1}'
```

## Step 6: Install RKE2 Agent (Worker Node)

Run these commands on each worker node:

```bash
# On the worker node: Install RKE2 agent
curl -sfL https://get.rke2.io | sudo env INSTALL_RKE2_TYPE="agent" sh -

# Create agent configuration
sudo mkdir -p /etc/rancher/rke2/

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# Connect to the RKE2 server
server: https://<SERVER_IP>:9345
# Token from the server node
token: <NODE_TOKEN>
EOF

# Enable and start RKE2 agent
sudo systemctl enable rke2-agent.service
sudo systemctl start rke2-agent.service

# Monitor agent startup
sudo journalctl -u rke2-agent -f
```

## Step 7: Verify the Installation

```bash
# On the server node, verify all nodes are ready
kubectl get nodes -o wide

# Check all system pods are running
kubectl get pods -n kube-system
kubectl get pods -n cattle-system 2>/dev/null

# Check the RKE2 version
rke2 --version
```

## Step 8: Install a Specific RKE2 Version

```bash
# Install a specific RKE2 version (recommended for production)
# Check available versions at: https://github.com/rancher/rke2/releases

INSTALL_RKE2_VERSION="v1.34.6+rke2r3"
curl -sfL https://get.rke2.io | \
  sudo env INSTALL_RKE2_VERSION="$INSTALL_RKE2_VERSION" sh -
```

## Conclusion

Installing RKE2 on Ubuntu is straightforward with the installation script. RKE2 provides a hardened Kubernetes distribution that bundles all necessary components including containerd, CNI plugins, and security policies. Once installed, you can manage your cluster with standard kubectl commands and optionally import it into Rancher for centralized management across multiple clusters.
