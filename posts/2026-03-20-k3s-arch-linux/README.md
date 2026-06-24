# How to Install K3s on Arch Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Arch Linux, Linux, Installation

Description: A guide to installing K3s on Arch Linux, covering the AUR package and manual installation approaches with systemd service configuration.

## Introduction

Arch Linux's rolling release model and minimal base make it an interesting platform for K3s. While not a typical enterprise choice, Arch is popular among developers and enthusiasts who want a fully controlled system. K3s can be installed on Arch via the AUR or via the official install script, with systemd handling service management.

## Step 1: Update the System

```bash
# Update all packages

sudo pacman -Syu

# Install base tools
sudo pacman -S --needed curl wget git vim base-devel

# Verify kernel version
uname -r
```

## Step 2: Install an AUR Helper (Optional)

```bash
# Install yay for AUR access (if not already installed)
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si
cd ..
rm -rf yay

# Verify
yay --version
```

## Step 3: Configure Kernel Modules

```bash
# Enable required kernel modules
sudo tee /etc/modules-load.d/k3s.conf > /dev/null <<EOF
br_netfilter
overlay
ip_tables
ip6_tables
nf_conntrack
EOF

# Load them immediately
sudo modprobe -a br_netfilter overlay ip_tables ip6_tables nf_conntrack

# Configure sysctl
sudo tee /etc/sysctl.d/99-k3s.conf > /dev/null <<EOF
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv6.conf.all.forwarding = 1
EOF

sudo sysctl --system
```

## Step 4: Disable Swap

```bash
# Check and disable swap
sudo swapoff -a

# Disable zram-backed swap if present
sudo swapoff /dev/zram0 2>/dev/null || true

# Comment out swap in /etc/fstab
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# If using systemd-swap, disable the service
sudo systemctl disable --now systemd-swap 2>/dev/null || true

# Verify
free -h
```

## Step 5: Configure cgroups

Arch Linux typically uses cgroup v2 with recent kernels:

```bash
# Check cgroup version
cat /proc/cgroups | head -5
stat -fc %T /sys/fs/cgroup/
# "cgroup2fs" = v2
#
# Recent Arch systems use cgroup v2 by default, so no extra bootloader
# setting is usually required. If this is not "cgroup2fs", check your
# bootloader and kernel configuration before installing K3s.
```

## Step 6: Option A - Install via AUR

```bash
# Install K3s from the AUR
yay -S k3s-bin

# The AUR package creates systemd service files automatically
# Enable and start K3s
sudo systemctl enable k3s
sudo systemctl start k3s

# Check status
sudo systemctl status k3s
```

## Step 7: Option B - Install via the Official Script

```bash
# Create K3s configuration
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "ArchK3sToken"
tls-san:
  - $(hostname -I | awk '{print $1}')
  - $(hostname)
kubelet-arg:
  - "max-pods=110"
  - "kube-reserved=cpu=200m,memory=256Mi"
  - "system-reserved=cpu=200m,memory=256Mi"
EOF

# Install K3s using the official script
curl -sfL https://get.k3s.io | sudo sh -

# Verify systemd service was created
sudo systemctl status k3s
```

## Step 8: Install iptables (if needed)

Arch's `iptables` package uses the nft backend by default. K3s needs the iptables userspace tools available:

```bash
# Check which iptables version is installed
iptables --version

# Install Arch's default iptables package if it is missing
sudo pacman -S --needed iptables

# If you run into host iptables compatibility issues, K3s can use its
# bundled iptables binaries with --prefer-bundled-bin
```

## Step 9: Configure kubectl

```bash
# Set up kubectl access
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config

# K3s always provides the embedded kubectl as "k3s kubectl".
# The install script also creates a standalone kubectl symlink.
k3s kubectl get nodes
k3s kubectl get pods --all-namespaces
```

## Step 10: Verify Installation

```bash
# Check all K3s components are running
k3s kubectl get pods -n kube-system

# Check node status
k3s kubectl get nodes -o wide

# Run a test pod
k3s kubectl run arch-test --image=alpine --restart=Never -- sleep 30
k3s kubectl get pod arch-test -w
k3s kubectl delete pod arch-test
```

## Step 11: Adding an Agent Node on Arch Linux

On additional Arch Linux nodes:

```bash
# Perform steps 1-5 on the agent node, then:
sudo mkdir -p /etc/rancher/k3s

# Use the token from /var/lib/rancher/k3s/server/node-token on the server node
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
server: "https://SERVER_IP:6443"
token: "SERVER_NODE_TOKEN"
EOF

# Install K3s agent
curl -sfL https://get.k3s.io | \
    sudo env INSTALL_K3S_EXEC="agent" sh -

sudo systemctl status k3s-agent
```

## Keeping K3s Updated on Arch

Since Arch is a rolling release, keep K3s updated:

```bash
# If using the AUR package
yay -Syu k3s-bin

# If using the install script, re-run it against the stable channel
curl -sfL https://get.k3s.io | \
    sudo env INSTALL_K3S_CHANNEL="stable" sh -
```

## Arch-Specific Troubleshooting

### containerd fails to start

```bash
# Check containerd status (K3s uses embedded containerd)
sudo journalctl -u k3s | grep containerd

# If overlay filesystem is not supported
sudo modprobe overlay
echo "overlay" | sudo tee /etc/modules-load.d/overlay.conf
```

### Network policies not working

```bash
# Arch may need additional netfilter modules
sudo modprobe nf_conntrack
sudo modprobe nft_compat
sudo modprobe xt_conntrack

# Make them persistent
cat << 'EOF' | sudo tee /etc/modules-load.d/netfilter.conf
nf_conntrack
nft_compat
xt_conntrack
EOF
```

## Conclusion

K3s installs cleanly on Arch Linux via the official install script or the AUR package. The main considerations are loading the correct kernel modules, ensuring swap is disabled, and configuring iptables/nftables compatibility. Arch's rolling release nature means you get access to the latest kernels with improved cgroup v2 support. Whether you use it as a local development environment or a minimal edge node, K3s on Arch Linux gives you full control with minimal overhead.
