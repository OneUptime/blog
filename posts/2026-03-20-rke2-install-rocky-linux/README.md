# How to Install RKE2 on Rocky Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Rocky Linux, Installation, Rancher

Description: A step-by-step guide to installing RKE2 on Rocky Linux 8 and 9, the enterprise-grade CentOS replacement, for a production-ready Kubernetes cluster.

Rocky Linux is an enterprise-grade Linux distribution designed as a downstream rebuild of Red Hat Enterprise Linux (RHEL), making it an ideal CentOS replacement for organizations that relied on CentOS 7/8. RKE2 works excellently on Rocky Linux and is often the preferred combination for enterprises seeking a stable, secure Kubernetes platform.

## Prerequisites

- A supported Rocky Linux 8 or 9 release from the RKE2 support matrix
- Minimum 2 vCPUs and 4 GB RAM
- Root or sudo access
- Static IP addresses for all nodes
- Unique hostnames for all nodes

## Step 1: System Preparation

```bash
# Update all packages

sudo dnf update -y

# Disable swap
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Keep SELinux enforcing; RKE2 RPM installs include SELinux support
sudo getenforce

# Load kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter

cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

# Configure sysctl settings
cat <<EOF | sudo tee /etc/sysctl.d/99-kubernetes.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
vm.swappiness                       = 0
EOF

sudo sysctl --system

# Configure NetworkManager to ignore Canal-managed interfaces
if systemctl is-enabled --quiet NetworkManager; then
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

## Step 3: Install RKE2

```bash
# Install RKE2 using the official installation script
curl -sfL https://get.rke2.io | sudo sh -

# Verify the installation
rke2 --version

# On Rocky Linux, the RPM-based installer creates:
# /usr/bin/rke2                                  - RKE2 binary
# /usr/lib/systemd/system/rke2-server.service   - Systemd unit file
# /etc/rancher/rke2/                            - Configuration directory
```

## Step 4: Configure the Server

```bash
# Create configuration file
sudo mkdir -p /etc/rancher/rke2/

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# Write kubeconfig with explicit permissions for the kubectl setup below
write-kubeconfig-mode: "0644"

# Enable SELinux support in containerd
selinux: true

# Additional SANs for the API server certificate
tls-san:
  - "my-cluster.example.com"
  - "$(hostname -I | awk '{print $1}')"

# Cluster configuration
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
cluster-dns: 10.43.0.10

# RKE2 uses Canal by default; set cni only when choosing a different plugin
# cni: canal
EOF

# Start the RKE2 server
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service
```

## Step 5: Monitor Installation

```bash
# Watch the installation progress
sudo journalctl -u rke2-server -f

# RKE2 will:
# 1. Download required container images
# 2. Start etcd
# 3. Start kube-apiserver
# 4. Start kube-controller-manager
# 5. Start kube-scheduler
# 6. Deploy Canal CNI
# 7. Deploy CoreDNS
# Wait for all steps to complete (~3-5 minutes)

# Check node status
sudo /var/lib/rancher/rke2/bin/kubectl \
  --kubeconfig /etc/rancher/rke2/rke2.yaml \
  get nodes
```

## Step 6: Configure kubectl

```bash
# Set up kubectl for regular user access
mkdir -p ~/.kube
sudo cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Add RKE2 binaries to PATH
echo 'export PATH=$PATH:/var/lib/rancher/rke2/bin' | tee -a ~/.bashrc
echo 'export KUBECONFIG=~/.kube/config' | tee -a ~/.bashrc
source ~/.bashrc

# Verify
kubectl get nodes -o wide
kubectl get pods -A
```

## Step 7: Join Worker Nodes

```bash
# Get the cluster token from the server node
sudo cat /var/lib/rancher/rke2/server/node-token

# On each worker node - install RKE2 agent
curl -sfL https://get.rke2.io | sudo env INSTALL_RKE2_TYPE="agent" sh -

# Configure the agent
sudo mkdir -p /etc/rancher/rke2/

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
server: https://<SERVER_IP>:9345
token: <NODE_TOKEN>
selinux: true
EOF

# Start the agent service
sudo systemctl enable rke2-agent.service
sudo systemctl start rke2-agent.service

# Verify the node joined from the server
kubectl get nodes
```

## Rocky Linux 9 Specific Considerations

```bash
# Rocky Linux 9 uses cgroups v2 by default
# Kubernetes supports cgroups v2, but verify the configuration
# Check cgroup version
stat -fc %T /sys/fs/cgroup/

# For Rocky Linux 9, no special cgroup configuration is typically needed
# The kubelet auto-detects and configures accordingly

# Confirm firewalld is disabled as described above
systemctl is-active firewalld
# Canal requires iptables or xtables-nft packages on the node
```

## Conclusion

Installing RKE2 on Rocky Linux provides a stable, enterprise-grade Kubernetes foundation that aligns well with organizations transitioning from CentOS. Rocky Linux's close compatibility with RHEL means security patches and enterprise software support are readily available. Combined with RKE2's built-in security features, this makes an excellent platform for production Kubernetes workloads. After installation, consider importing the cluster into Rancher for centralized management, monitoring, and security scanning.
