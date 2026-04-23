# How to Install RKE2 on Debian

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Debian, Installation, Rancher

Description: A step-by-step guide to installing RKE2 on Debian 11 (Bullseye) and Debian 12 (Bookworm) for a production-ready Kubernetes cluster.

Debian is a widely used Linux distribution known for its stability and extensive package repository. RKE2 generally works on Linux distributions that use systemd and iptables or xtables-nft, which includes typical Debian installations. This guide covers the complete installation process for both Debian 11 (Bullseye) and Debian 12 (Bookworm).

## Prerequisites

- Debian 11 (Bullseye) or Debian 12 (Bookworm)
- Minimum 2 vCPUs and 4 GB RAM
- Root or sudo access
- Unique hostnames for each node
- Static IP addresses recommended

## Step 1: Update System and Install Prerequisites

```bash
# Update package lists and upgrade existing packages

sudo apt-get update && sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y \
  curl \
  wget \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release \
  apparmor \
  iptables \
  nftables \
  socat \
  conntrack \
  nfs-common

# Disable swap
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Verify swap is disabled
swapon --summary
```

## Step 2: Load Kernel Modules

```bash
# Load required kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter

# Persist across reboots
cat <<EOF | sudo tee /etc/modules-load.d/rke2.conf
overlay
br_netfilter
EOF

# Configure sysctl settings for Kubernetes networking
cat <<EOF | sudo tee /etc/sysctl.d/99-rke2.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# Apply settings immediately
sudo sysctl --system

# Verify settings
sysctl net.bridge.bridge-nf-call-iptables
sysctl net.ipv4.ip_forward
```

## Step 3: Configure Firewall

```bash
# Debian can use nftables directly, iptables-nft, or ufw
# If using ufw:
sudo apt-get install -y ufw

# Check ufw status before enabling
sudo ufw status

# Replace with the subnet that contains your RKE2 server and worker nodes
RKE2_NODE_SUBNET="192.0.2.0/24"

# Allow required ports
sudo ufw allow 22/tcp                                                             # SSH - ensure this is first!
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 6443 proto tcp                # Kubernetes API server
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 9345 proto tcp                # RKE2 supervisor API
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 2379 proto tcp                # etcd client
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 2380 proto tcp                # etcd peer
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 2381 proto tcp                # etcd metrics
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 10250 proto tcp               # Kubelet metrics
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 30000:32767 proto tcp         # NodePort services
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 8472 proto udp                # Canal VXLAN
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 9099 proto tcp                # Canal health checks
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 51820 proto udp               # Canal WireGuard IPv4, if enabled
sudo ufw allow from ${RKE2_NODE_SUBNET} to any port 51821 proto udp               # Canal WireGuard IPv6, if enabled

# Enable ufw
sudo ufw enable
sudo ufw status verbose
```

## Step 4: Install RKE2

```bash
# Download and install RKE2
curl -sfL https://get.rke2.io | sudo sh -

# Optionally install a specific version
# curl -sfL https://get.rke2.io | sudo env INSTALL_RKE2_VERSION=v1.34.6+rke2r3 sh -

# Verify the installation binaries are in place
ls /usr/local/bin/rke2
ls /usr/local/lib/systemd/system/rke2-server.service
```

## Step 5: Configure RKE2 Server

```bash
# Create configuration directory and file
sudo mkdir -p /etc/rancher/rke2/

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# RKE2 server configuration

# TLS SANs - add all names/IPs that will be used to access the API server
tls-san:
  - "k8s.example.com"
  - "$(hostname -I | awk '{print $1}')"

# Set kubeconfig permissions
write-kubeconfig-mode: "0644"

# Cluster networking
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
EOF

# Enable and start RKE2
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service

# The initial startup takes 3-5 minutes
# Monitor progress:
sudo journalctl -u rke2-server -f --no-pager
```

## Step 6: Verify Server Installation

```bash
# Configure kubectl for the current user
mkdir -p ~/.kube
sudo cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
chmod 600 ~/.kube/config

# Add RKE2 bin to PATH
echo 'export PATH=$PATH:/var/lib/rancher/rke2/bin' >> ~/.bashrc
source ~/.bashrc

# Check node status
kubectl get nodes

# Check pods; Running and Completed are expected states
kubectl get pods -A
```

## Step 7: Add Worker Nodes

```bash
# Get the server token (run on the server node)
SERVER_TOKEN=$(sudo cat /var/lib/rancher/rke2/server/node-token)
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Server IP: $SERVER_IP"
echo "Token: $SERVER_TOKEN"

# On each worker node - Run the following:
# Set these values from the server output above
SERVER_IP="<server-ip>"
SERVER_TOKEN="<token-from-server-node>"

# 1. Install RKE2 agent
curl -sfL https://get.rke2.io | sudo env INSTALL_RKE2_TYPE="agent" sh -

# 2. Configure agent
sudo mkdir -p /etc/rancher/rke2/
cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
server: https://${SERVER_IP}:9345
token: ${SERVER_TOKEN}
EOF

# 3. Start agent service
sudo systemctl enable rke2-agent.service
sudo systemctl start rke2-agent.service

# 4. On server, verify worker joined
kubectl get nodes
```

## Debian 12 Specific Notes

```bash
# Debian 12 (Bookworm) uses nftables by default
# Verify nftables is active
sudo nft list tables

# Check if iptables is in nftables compatibility mode
sudo update-alternatives --display iptables

# RKE2's default Canal CNI requires iptables or xtables-nft
```

## Conclusion

Installing RKE2 on Debian follows the standard Linux installation process with some Debian-specific package management considerations. Debian's stable release cycle makes it an excellent choice for Kubernetes nodes that require predictable, well-tested software. Once your RKE2 cluster is running on Debian, you can import it into Rancher for centralized management, apply CIS benchmark scans to verify security compliance, and deploy workloads using the full Kubernetes feature set.
