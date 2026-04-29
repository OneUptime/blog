# How to Set Up WireGuard for K3s Flannel Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, WireGuard, Flannel, Networking, Security, VPN

Description: Learn how to configure K3s Flannel to use WireGuard as its backend for encrypted pod-to-pod communication across nodes.

## Introduction

By default, K3s uses Flannel with VXLAN backend for pod networking, which provides no encryption for inter-node traffic. For security-sensitive deployments, K3s supports using **WireGuard** as the Flannel backend to encrypt all pod traffic between nodes. WireGuard offers excellent performance with minimal overhead compared to other VPN solutions. This guide covers configuring K3s with the WireGuard Flannel backend.

## Prerequisites

- Linux kernel 5.6+ (WireGuard is built-in) or WireGuard kernel module installed
- Root/sudo access on all K3s nodes
- K3s not yet installed (for fresh setup) or ability to restart the cluster

## Step 1: Install WireGuard Kernel Module

WireGuard support is required on all nodes:

```bash
# Check kernel version
uname -r

# Verify WireGuard support is available
ip link add dev wg-test type wireguard && ip link delete wg-test

# For older kernels or if WireGuard is not available, install it
# Ubuntu/Debian
apt-get update && apt-get install -y wireguard

# RHEL 8
yum install -y \
  https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm \
  https://www.elrepo.org/elrepo-release-8.el8.elrepo.noarch.rpm
yum install -y kmod-wireguard wireguard-tools

# CentOS 8
yum install -y elrepo-release epel-release
yum install -y kmod-wireguard wireguard-tools

# Raspberry Pi OS / Debian-based systems
apt-get install -y raspberrypi-kernel-headers
apt-get install -y wireguard
```

## Step 2: Install K3s with WireGuard Backend

### Fresh Installation

```bash
# Install K3s server with the supported WireGuard Flannel backend
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="--flannel-backend=wireguard-native" \
  sh -
```

### Using Config File

```yaml
# /etc/rancher/k3s/config.yaml
flannel-backend: wireguard-native
```

Then install K3s:

```bash
curl -sfL https://get.k3s.io | sh -
```

## Step 3: Install K3s Agents with WireGuard

Agent nodes also need WireGuard installed:

```bash
# Ensure WireGuard is installed on agent nodes
apt-get install -y wireguard

# Install K3s agent
curl -sfL https://get.k3s.io | \
  K3S_URL=https://<server-ip>:6443 \
  K3S_TOKEN=<node-token> \
  sh -

# The agent automatically uses WireGuard when the server uses it
```

## Step 4: Verify WireGuard Interfaces

After installation, verify WireGuard interfaces are created:

```bash
# List WireGuard interfaces
wg show interfaces

# View WireGuard interface details
ip link show flannel-wg
# For dual-stack or IPv6 clusters, you may also see flannel-wg-v6

# Check WireGuard status (requires wireguard-tools)
wg show

# Expected output:
# interface: flannel-wg
#   public key: <base64-public-key>
#   listening port: 51820
#
# peer: <node2-public-key>
#   endpoint: 192.168.1.11:51820
#   latest handshake: X seconds ago
#   transfer: X MiB received, X MiB sent
```

## Step 5: Verify Encrypted Pod Communication

```bash
# Deploy test pods on different nodes
kubectl run pod-a --image=busybox --restart=Never \
  --overrides='{"spec":{"nodeName":"node1"}}' \
  -- sleep 3600

kubectl run pod-b --image=busybox --restart=Never \
  --overrides='{"spec":{"nodeName":"node2"}}' \
  -- sleep 3600

# Wait for both Pods to be running
kubectl wait --for=condition=Ready pod/pod-a pod/pod-b --timeout=120s

# Get Pod A's IP
POD_A_IP=$(kubectl get pod pod-a -o jsonpath='{.status.podIP}')

# Ping from Pod B to Pod A (cross-node communication)
kubectl exec pod-b -- ping -c 4 $POD_A_IP

# Verify WireGuard is encrypting traffic
# On the host's external interface, you should see WireGuard traffic on UDP 51820
# but not plaintext pod traffic crossing between nodes

# tcpdump to verify
tcpdump -i any -n udp port 51820 -c 20
# Should show UDP traffic on 51820 (WireGuard encrypted)

# Clean up
kubectl delete pod pod-a pod-b
```

## Step 6: Configure WireGuard Port (Optional)

The default Flannel WireGuard port is 51820/UDP for IPv4 and 51821/UDP for IPv6. If you need to change it, use a custom Flannel config file via `--flannel-conf` because K3s does not expose a dedicated flag just for WireGuard listen ports:

```bash
# Check current WireGuard listen ports
ss -ulnp | grep -E '51820|51821'

# K3s can override the Flannel config file with --flannel-conf
# Flannel's wireguard backend supports ListenPort and ListenPortV6

# Ensure port 51820/UDP is open in your firewall
# UFW
ufw allow 51820/udp
# If using IPv6, also open 51821/udp

# firewalld
firewall-cmd --permanent --add-port=51820/udp
# If using IPv6, also open 51821/udp
firewall-cmd --reload

# iptables
iptables -A INPUT -p udp --dport 51820 -j ACCEPT
```

## Step 7: WireGuard Native

Current K3s releases use `wireguard-native`. The legacy `wireguard` backend is deprecated and is not available in K3s v1.26 and higher:

```yaml
# /etc/rancher/k3s/config.yaml
flannel-backend: wireguard-native
```

```bash
# Verify native WireGuard is in use
wg show
# Interface name should be 'flannel-wg' or 'flannel-wg-v6' for IPv6
```

## Step 8: Monitor WireGuard Statistics

```bash
# View WireGuard statistics
wg show all dump

# Monitor transfer statistics
watch -n 2 'wg show all'

# Check K3s logs for WireGuard-related events
journalctl -u k3s -u k3s-agent | grep -i wireguard

# Check WireGuard peer connections
wg show all peers
```

## Troubleshooting

**WireGuard interface not created:**
```bash
# Verify the kernel can create a WireGuard interface
ip link add dev wg-test type wireguard && ip link delete wg-test

# Check K3s and agent logs
journalctl -u k3s -u k3s-agent | grep -i wireguard
```

**Pods can't communicate across nodes:**
```bash
# Verify WireGuard handshakes are happening
wg show
# 'latest handshake' should be recent

# Check that the expected UDP ports are listening
ss -ulnp | grep -E '51820|51821'

# While generating cross-node traffic, verify encrypted UDP packets are present
tcpdump -ni any 'udp port 51820 or udp port 51821'
```

**Poor performance:**
```bash
# WireGuard performance should be excellent
# If slow, check CPU usage on the WireGuard cipher operations
# Consider using wireguard-native backend for better kernel integration
```

## Conclusion

Configuring K3s with WireGuard as the Flannel backend encrypts all inter-node pod traffic with minimal performance overhead. WireGuard's simplicity and excellent kernel integration make it ideal for K3s deployments where you need encrypted pod networking. For new clusters, use `wireguard-native` for the best performance; for existing clusters, plan a maintenance window to switch backends as it requires a restart of all K3s nodes.
