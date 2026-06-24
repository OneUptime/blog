# How to Install RKE2 on CentOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, CentOS, Installation, Rancher

Description: A step-by-step guide to installing RKE2 (Rancher Kubernetes Engine 2) on CentOS 7 and CentOS 8 for a production-ready Kubernetes cluster.

RKE2 provides a secure, compliant Kubernetes distribution that is well-suited for enterprise environments running supported Enterprise Linux distributions. This guide covers the installation process on CentOS Stream or RHEL-compatible hosts, including the specific prerequisites and configurations needed for these distributions.

## Prerequisites

- CentOS Stream 9/10 for lab use, or a supported RHEL-compatible 8/9/10 release from the RKE2 support matrix for production
- Do not build new production clusters on CentOS Linux 7 or CentOS Linux 8; CentOS Linux 7 reached EOL on June 30, 2024, and CentOS Linux 8 reached EOL on December 31, 2021
- Minimum 2 vCPUs and 4 GB RAM per node
- Root or sudo access
- Network connectivity between nodes
- Unique hostnames for all nodes

## Step 1: Prepare the System

```bash
# Update system packages

sudo dnf update -y

# Disable swap
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab

# Keep SELinux enforcing; RKE2 RPM installs include SELinux support
sudo getenforce

# Load required kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter

cat <<EOF | sudo tee /etc/modules-load.d/rke2.conf
overlay
br_netfilter
EOF

# Configure required sysctl parameters
cat <<EOF | sudo tee /etc/sysctl.d/99-rke2.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system

# Configure NetworkManager to ignore Canal-managed interfaces
if systemctl is-active --quiet NetworkManager || systemctl is-enabled --quiet NetworkManager; then
  sudo mkdir -p /etc/NetworkManager/conf.d

  cat <<EOF | sudo tee /etc/NetworkManager/conf.d/rke2-canal.conf
[keyfile]
unmanaged-devices=interface-name:flannel*;interface-name:cali*;interface-name:tunl*;interface-name:vxlan.calico;interface-name:vxlan-v6.calico;interface-name:wireguard.cali;interface-name:wg-v6.cali
EOF

  sudo systemctl reload NetworkManager
fi
```

## Step 2: Configure Firewall

```bash
# RKE2's default Canal CNI manages iptables/nftables rules itself.
# Disable firewalld on RKE2 nodes to avoid conflicts.
if systemctl is-active --quiet firewalld || systemctl is-enabled --quiet firewalld; then
  sudo systemctl disable --now firewalld
fi

# In your external firewall or security group, allow only node-to-node traffic for:
# 6443/tcp        - Kubernetes API to server nodes
# 9345/tcp        - RKE2 supervisor API to server nodes
# 2379-2381/tcp   - etcd between server nodes
# 10250/tcp       - kubelet metrics/API between RKE2 nodes
# 8472/udp        - Canal VXLAN between RKE2 nodes
# 9099/tcp        - Canal health checks between RKE2 nodes
# 51820-51821/udp - Canal WireGuard only if you enable WireGuard
# 30000-32767/tcp - NodePort services if you use them
```

## Step 3: Install Required Dependencies

```bash
# Install required packages
sudo dnf install -y \
  curl \
  wget \
  tar \
  git \
  conntrack-tools \
  socat \
  nfs-utils

sudo dnf install -y iptables-nft || sudo dnf install -y iptables

# On Enterprise Linux 10 derivatives, install extra kernel modules for nf_conntrack
if [ "$(rpm -E '%{rhel}')" = "10" ]; then
  sudo dnf install -y kernel-modules-extra
fi

# Canal requires iptables or xtables-nft support on the node
```

## Step 4: Install RKE2 Server

```bash
# Download and install RKE2
curl -sfL https://get.rke2.io | sudo sh -

# Create the RKE2 configuration directory
sudo mkdir -p /etc/rancher/rke2/

# Create a basic server configuration
cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# Write kubeconfig with explicit permissions for the kubectl setup below
write-kubeconfig-mode: "0644"

# Enable SELinux support in containerd
selinux: true

# Bind the server to the node's IP
# node-ip: <NODE_IP>

# Optional: Specify the cluster DNS domain
cluster-dns: 10.43.0.10
cluster-domain: cluster.local

# Optional: configure additional SANs for the API server
# tls-san:
#   - my.dns.example.com
#   - 10.0.0.100
EOF

# Enable and start the RKE2 server
sudo systemctl enable rke2-server
sudo systemctl start rke2-server

# Monitor startup logs
sudo journalctl -u rke2-server -f &
```

## Step 5: Verify Installation

```bash
# Add RKE2 binaries to PATH
cat >> ~/.bashrc << 'EOF'
export PATH=$PATH:/var/lib/rancher/rke2/bin
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
EOF

source ~/.bashrc

# Wait for RKE2 to be ready
sleep 30

# Check nodes
kubectl get nodes

# Check all pods
kubectl get pods -A
```

## Step 6: Install RKE2 Agent on Worker Nodes

```bash
# On the server node, get the server token first:
sudo cat /var/lib/rancher/rke2/server/node-token

# On each worker node:
# Install RKE2 agent
curl -sfL https://get.rke2.io | sudo env INSTALL_RKE2_TYPE="agent" sh -

# Configure the agent
sudo mkdir -p /etc/rancher/rke2/

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# Server URL for the RKE2 control plane
server: https://<SERVER_IP>:9345
# Authentication token
token: <NODE_TOKEN>
selinux: true
EOF

# Start the agent
sudo systemctl enable rke2-agent
sudo systemctl start rke2-agent

# Watch logs for issues
sudo journalctl -u rke2-agent -f
```

## Step 7: Handle CentOS Linux 7 and 8

```bash
# CentOS Linux 7 and 8 are end-of-life and are not current production targets.
# CentOS Linux 7 reached EOL on 2024-06-30.
# CentOS Linux 8 reached EOL on 2021-12-31.
# Migrate to CentOS Stream or a supported Enterprise Linux distribution before installing RKE2.
cat /etc/centos-release
```

## Conclusion

Installing RKE2 on CentOS Stream or supported Enterprise Linux hosts follows the same general process as other Linux distributions, with a few CentOS-specific considerations like NetworkManager configuration and avoiding firewalld conflicts with the default Canal CNI. CentOS Linux 7 and CentOS Linux 8 are both end-of-life, so migrate to a supported Enterprise Linux distribution before building a production RKE2 cluster. Once RKE2 is installed, you can register the cluster with Rancher for centralized management.
