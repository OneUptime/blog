# How to Install K3s on Alpine Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Alpine Linux, Lightweight, Edge Computing

Description: Step-by-step guide to installing K3s on Alpine Linux, addressing its unique musl libc and OpenRC init system requirements.

## Introduction

Alpine Linux is a security-focused, minimal Linux distribution that uses musl libc and BusyBox instead of glibc and GNU tools. Its small footprint makes it attractive for container hosts and edge deployments. Installing K3s on Alpine requires a few Alpine-specific checks due to its non-standard init system (OpenRC instead of systemd) and cgroup setup.

## Alpine Version Requirements

- Alpine Linux 3.19 or newer is recommended
- Use a current K3s release from the stable channel
- Both x86_64 and ARM64 are supported

## Step 1: Install Alpine Linux

If installing from scratch, use the Alpine Extended ISO (includes networking tools):

```bash
# After installation, update and install commonly used host packages

apk update && apk upgrade

# Install required packages
apk add --no-cache \
    curl \
    bash \
    coreutils \
    findutils \
    util-linux \
    mount \
    blkid \
    nfs-utils \
    iptables \
    cni-plugins

# Verify the architecture
uname -m
```

## Step 2: Enable Required Kernel Modules and cgroups

Alpine uses OpenRC, and current releases default to cgroup v2. Ensure the required modules, sysctls, and cgroup service are enabled:

```bash
# Persist required kernel modules
cat > /etc/modules-load.d/k3s.conf <<EOF
br_netfilter
overlay
nf_conntrack
EOF

# Load them immediately
modprobe br_netfilter
modprobe overlay
modprobe nf_conntrack

# Enable IPv4 forwarding and bridge netfiltering
cat >> /etc/sysctl.conf <<EOF
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF
sysctl -p

# Ensure cgroups are mounted by OpenRC
rc-service cgroups start
rc-update add cgroups
```

## Step 3: Disable Swap

```bash
# Check and disable swap
swapoff -a
sed -i '/swap/d' /etc/fstab

# Verify
free -h
```

## Step 4: Glibc Compatibility Is Usually Not Required

K3s has minimal OS dependencies and does not normally require glibc compatibility packages on Alpine for a standard installation, so you can skip this step unless other software on the node needs them.

## Step 5: Install K3s

```bash
# Create configuration directory
mkdir -p /etc/rancher/k3s

# Create K3s configuration
cat > /etc/rancher/k3s/config.yaml <<EOF
token: "AlpineK3sToken"
kubelet-arg:
  - "max-pods=110"
  - "resolv-conf=/etc/resolv.conf"
EOF

# Install K3s; the installer creates an OpenRC service on Alpine
curl -sfL https://get.k3s.io | sh -
```

## Step 6: Verify the OpenRC Service

On Alpine, the K3s install script creates and starts an OpenRC service automatically:

```bash
# Check status
rc-service k3s status

# Follow the OpenRC log file
tail -f /var/log/k3s.log
```

## Step 7: Configure kubectl

```bash
# Use the admin kubeconfig written by K3s
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Test access (K3s installs kubectl)
k3s kubectl get nodes
# Or
kubectl get nodes
```

## Step 8: Configure an Agent Node on Alpine

For agent nodes, use the same installer and let it create the OpenRC service:

```bash
# On the agent node
mkdir -p /etc/rancher/k3s

cat > /etc/rancher/k3s/config.yaml <<EOF
server: "https://SERVER_IP:6443"
token: "AlpineK3sToken"
EOF

# Install K3s as agent; the installer creates the k3s-agent OpenRC service
curl -sfL https://get.k3s.io | \
    INSTALL_K3S_EXEC="agent" \
    sh -

# Check status
rc-service k3s-agent status
```

## Troubleshooting Alpine-Specific Issues

### CNI Plugins Not Found

```bash
# Install CNI plugins manually if not included
apk add --no-cache cni-plugins

# Copy to the K3s CNI directory
mkdir -p /var/lib/rancher/k3s/data/cni
cp /usr/libexec/cni/* /var/lib/rancher/k3s/data/cni/
```

### iptables Not Working

```bash
# If your environment requires legacy xtables binaries
apk add --no-cache iptables-legacy

# Set iptables to use legacy mode
ln -sf /sbin/iptables-legacy /sbin/iptables
ln -sf /sbin/ip6tables-legacy /sbin/ip6tables
```

### DNS Resolution Failing in Pods

```bash
# Check the resolv.conf K3s is using
k3s kubectl exec -it <pod> -- cat /etc/resolv.conf

# Ensure the host resolv.conf is valid
cat /etc/resolv.conf

# Configure K3s to use a specific resolv.conf
# Add to /etc/rancher/k3s/config.yaml:
# kubelet-arg:
#   - "resolv-conf=/etc/resolv.conf"
```

## Conclusion

K3s works on Alpine Linux but requires extra attention to OpenRC service management and cgroup configuration. Alpine's minimal footprint makes it an efficient K3s host when properly configured. The main Alpine-specific considerations are the OpenRC init system (no systemd) and ensuring the required kernel modules and cgroups are available. Once these are addressed, K3s runs well and benefits from Alpine's security-hardened, minimal base.
