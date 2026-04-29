# How to Install K3s on Fedora

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Fedora, Linux, Installation

Description: A guide to installing K3s on Fedora Linux, addressing SELinux, firewalld, and cgroup v2 requirements.

## Introduction

Fedora is a cutting-edge Linux distribution that often ships with the latest kernel features. Installing K3s on Fedora is straightforward but requires attention to Fedora-specific configurations: SELinux policies, firewalld rules, and cgroup v2 (which Fedora enables by default). This guide covers all the necessary steps for a successful K3s installation on Fedora.

## Tested Versions

- Fedora 37, 38, 39, 40
- K3s v1.26+

## Step 1: Update the System

```bash
# Update all packages

sudo dnf update -y

# Install useful tools
sudo dnf install -y curl wget git vim htop

# Check the Fedora version
cat /etc/fedora-release
uname -r
```

## Step 2: Configure Firewalld

Fedora uses firewalld by default. Open the ports K3s needs:

```bash
# Open K3s API server port on server nodes
sudo firewall-cmd --permanent --add-port=6443/tcp

# Allow pod and service traffic on the default K3s CIDRs
sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
sudo firewall-cmd --permanent --zone=trusted --add-source=10.43.0.0/16

# Open port for kubelet metrics/API if you use metrics-server
sudo firewall-cmd --permanent --add-port=10250/tcp

# Flannel VXLAN between nodes (default backend)
sudo firewall-cmd --permanent --add-port=8472/udp

# Flannel WireGuard Native between nodes (if using that backend)
sudo firewall-cmd --permanent --add-port=51820/udp
sudo firewall-cmd --permanent --add-port=51821/udp

# Reload firewalld
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
sudo firewall-cmd --zone=trusted --list-all
```

## Step 3: Configure SELinux

Fedora ships with SELinux in enforcing mode. K3s requires SELinux policies:

```bash
# Check SELinux status
getenforce
# Output: Enforcing

# Option 1: Install the dependencies required by the K3s SELinux policy
sudo dnf install -y container-selinux selinux-policy-base

# Install the K3s SELinux policy
sudo dnf install -y https://rpm.rancher.io/k3s/latest/common/centos/9/noarch/k3s-selinux-1.6-1.el9.noarch.rpm

# The K3s install script can also install the K3s SELinux RPM automatically
# if the node has Internet access (covered in Step 7)

# Option 2: Set SELinux to permissive mode (not recommended for production)
# sudo setenforce 0
# sudo sed -i 's/^SELINUX=enforcing$/SELINUX=permissive/' /etc/selinux/config
```

## Step 4: Disable Swap

```bash
# Check if swap is active
free -h

# Disable all swap
sudo swapoff -a

# Comment out swap entries in /etc/fstab to persist across reboots
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Verify
free -h
```

## Step 5: Configure cgroup v2

Fedora uses cgroup v2 by default. Verify K3s compatibility:

```bash
# Check cgroup version
stat -fc %T /sys/fs/cgroup/
# "cgroup2fs" = cgroup v2
# "tmpfs" = cgroup v1

# The K3s releases covered by this guide work with Fedora's default cgroup v2 layout
# If you are using an older K3s release and hit cgroup issues, force cgroup v1

# To force cgroup v1 (if needed for older K3s releases):
# sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=0"
# sudo reboot

# For the K3s versions covered here, cgroup v2 works out of the box
```

## Step 6: Configure sysctl Settings

```bash
# Enable IP forwarding and bridge netfilter
sudo tee /etc/sysctl.d/k3s.conf > /dev/null <<EOF
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF

# Load br_netfilter module
sudo modprobe br_netfilter

# Make module loading persistent
echo "br_netfilter" | sudo tee /etc/modules-load.d/k3s.conf

# Apply sysctl settings
sudo sysctl --system
```

## Step 7: Install K3s

```bash
# Create configuration directory
sudo mkdir -p /etc/rancher/k3s

# Create K3s configuration
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "FedoraK3sToken"
selinux: true
tls-san:
  - $(hostname -I | awk '{print $1}')
  - $(hostname)
  - k3s.example.com
kubelet-arg:
  - "max-pods=110"
EOF

# Install K3s
# The installer can automatically install the k3s-selinux RPM if needed
curl -sfL https://get.k3s.io | sudo sh -

# Check service status
sudo systemctl status k3s
```

## Step 8: Configure kubectl

```bash
# Set up kubeconfig for the current user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Verify
kubectl get nodes
kubectl get pods --all-namespaces
```

## Step 9: Add an Agent Node on Fedora

```bash
# On the Fedora agent node, perform steps 1-6 first, then:
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
server: "https://SERVER_IP:6443"
token: "FedoraK3sToken"
selinux: true
EOF

# Install K3s agent with SELinux support
curl -sfL https://get.k3s.io | sudo env INSTALL_K3S_EXEC="agent" sh -

sudo systemctl status k3s-agent
```

## Step 10: Deploy and Test

```bash
# Deploy a test workload
kubectl create deployment test-nginx --image=nginx:alpine
kubectl rollout status deployment/test-nginx
kubectl expose deployment test-nginx --port=80 --type=NodePort

# Get the NodePort
kubectl get svc test-nginx
NODE_PORT=$(kubectl get svc test-nginx -o jsonpath='{.spec.ports[0].nodePort}')
NODE_IP=$(hostname -I | awk '{print $1}')

# Allow the NodePort through firewall
sudo firewall-cmd --permanent --add-port=${NODE_PORT}/tcp
sudo firewall-cmd --reload

# Test
curl http://$NODE_IP:$NODE_PORT

# Clean up
kubectl delete deployment test-nginx
kubectl delete svc test-nginx
```

## Troubleshooting Fedora-Specific Issues

### SELinux Denials

```bash
# Check for SELinux denials related to K3s
sudo ausearch -m AVC -ts recent | grep k3s

# Generate a local policy to allow denials (development only)
sudo ausearch -m AVC -ts recent | audit2allow -M k3s-local
sudo semodule -i k3s-local.pp
```

### firewalld Blocking Pod Traffic

```bash
# If pods can't communicate, add the pod CIDR to the trusted zone
sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
sudo firewall-cmd --permanent --zone=trusted --add-source=10.43.0.0/16
sudo firewall-cmd --reload
```

### cgroup v2 OOM Issues

```bash
# If pods are getting OOM-killed unexpectedly, inspect the cgroup hierarchy
systemd-cgls
# Then inspect the relevant memory.max files under /sys/fs/cgroup/
```

## Conclusion

K3s runs well on Fedora with proper SELinux policy installation and firewalld configuration. The main Fedora-specific considerations are opening firewall ports, ensuring the K3s SELinux RPM is installed, and verifying cgroup v2 compatibility with your K3s version. Fedora's up-to-date kernel benefits K3s with improved cgroup v2 performance and modern networking features, making it a capable K3s host for both development and production use.
