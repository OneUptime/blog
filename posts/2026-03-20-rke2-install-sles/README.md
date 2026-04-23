# How to Install RKE2 on SLES

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, SLE, SUSE, Installation, Rancher

Description: A comprehensive guide to installing RKE2 on SUSE Linux Enterprise Server (SLES) for enterprise Kubernetes deployments.

SUSE Linux Enterprise Server (SLES) is a popular enterprise Linux distribution in industries requiring certified enterprise software. RKE2 supports the SLES service packs listed in the RKE2 Support Matrix for each RKE2 minor version, making it an excellent choice for organizations already standardized on SUSE infrastructure. This guide covers RKE2 installation on SLES with proper configuration for enterprise environments.

## Prerequisites

- A SLES 15 service pack validated in the RKE2 Support Matrix for your target RKE2 version
- SUSE entitlement with access to SUSE Customer Center
- Minimum 2 vCPUs and 4 GB RAM
- Root access
- Network connectivity between nodes
- Unique hostnames for each node

## Step 1: Register SLES and Update

```bash
# Register SLES with SUSE Customer Center (if not already registered)

sudo SUSEConnect -r <REGISTRATION_CODE> -e <EMAIL>

# Add container module if you need SUSE container tools
sudo SUSEConnect -p sle-module-containers/$(. /etc/os-release; echo "${VERSION_ID}")/$(uname -m)

# Update system packages
sudo zypper refresh
sudo zypper update -y

# Install AppArmor parser required when the host kernel supports AppArmor
sudo zypper install -y apparmor-parser
```

## Step 2: Configure System Prerequisites

```bash
# Disable swap for Kubernetes
sudo swapoff -a

# Comment out swap entries in /etc/fstab
sudo sed -i '/swap/s/^/#/' /etc/fstab

# Load required kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter

# Persist module loading
cat <<EOF | sudo tee /etc/modules-load.d/rke2.conf
overlay
br_netfilter
EOF

# Configure sysctl parameters
cat <<EOF | sudo tee /etc/sysctl.d/99-rke2.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
net.ipv4.conf.all.forwarding        = 1
EOF

sudo sysctl --system
```

## Step 3: Configure Firewall

```bash
# SLES 15 uses firewalld, but RKE2's default Canal CNI conflicts with firewalld.
# Disable firewalld on RKE2 nodes when using the default Canal CNI.
sudo systemctl disable --now firewalld

# In your external firewall or security group, allow only RKE2 nodes to reach:
# TCP: 6443, 9345, 10250, 2379-2381, 30000-32767
# UDP: 8472 and TCP: 9099 for the default Canal VXLAN CNI
# UDP: 51820 and 51821 only if you enable Canal WireGuard
```

## Step 4: Install RKE2

```bash
# Install RKE2 using the official installation script
curl -sfL https://get.rke2.io | sudo sh -

# The installer detects the OS and configures appropriately
# For SLES, it will install the systemd service files

# Verify installation
ls -la /usr/local/bin/rke2
ls -la /usr/local/lib/systemd/system/rke2-server.service
```

## Step 5: Configure and Start RKE2 Server

```bash
# Create RKE2 configuration directory
sudo mkdir -p /etc/rancher/rke2/

# Create server configuration
cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# Write kubeconfig with world-readable permissions
write-kubeconfig-mode: "0644"

# TLS SANs for the API server
tls-san:
  - "$(hostname -f)"
  - "$(hostname -I | awk '{print $1}')"
EOF

# Enable and start RKE2 server
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service

# Monitor startup
sudo journalctl -u rke2-server -f
```

## Step 6: Configure kubectl Access

```bash
# Create kubectl symlink
sudo ln -sf /var/lib/rancher/rke2/bin/kubectl /usr/local/bin/kubectl

# Set up kubeconfig
mkdir -p ~/.kube
sudo cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Add RKE2 bin path
echo 'export PATH=$PATH:/var/lib/rancher/rke2/bin' >> ~/.bashrc
source ~/.bashrc

# Verify
kubectl get nodes
```

## Step 7: Install Agent on Worker Nodes

```bash
# On worker nodes (also running SLES):
# Install RKE2 agent
curl -sfL https://get.rke2.io | sudo env INSTALL_RKE2_TYPE="agent" sh -

# Get the token from the server
# Run on server: sudo cat /var/lib/rancher/rke2/server/node-token

# Configure the agent
sudo mkdir -p /etc/rancher/rke2/
cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
server: https://<SERVER_IP>:9345
token: <NODE_TOKEN>
EOF

# Start the agent
sudo systemctl enable rke2-agent.service
sudo systemctl start rke2-agent.service
```

## SLES-Specific Considerations

```bash
# SLES uses AppArmor instead of SELinux by default
# Check AppArmor status
sudo systemctl status apparmor

# RKE2 is compatible with AppArmor
# The containerd runtime will use AppArmor profiles

# Check available kernel features
grep -E "CONFIG_CGROUPS|CONFIG_BPF|CONFIG_VXLAN" /boot/config-$(uname -r)

# Confirm your SLES service pack is validated for your target RKE2 version
# in the RKE2 Support Matrix
```

## Conclusion

Installing RKE2 on SLES provides enterprise customers with a fully supported Kubernetes platform that integrates with their existing SUSE infrastructure. The combination of SLES's enterprise support and RKE2's security focus makes it particularly suitable for regulated industries. Once deployed, consider importing the cluster into Rancher for centralized management and leveraging Rancher's built-in CIS scanning to verify the security posture of your SLES-based RKE2 cluster.
