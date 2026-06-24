# How to Configure K3s Flannel Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Flannel, Networking, CNI

Description: Learn how to configure different Flannel backend modes in K3s including VXLAN, host-gw, WireGuard, and IPsec for optimal networking performance.

## Introduction

K3s uses Flannel as its default CNI plugin. Flannel supports multiple backend modes that determine how pod network traffic is encapsulated and routed between nodes. Choosing the right backend for your environment can significantly impact network performance, security, and compatibility. This guide covers the current Flannel backends available in K3s and notes the legacy IPsec backend for older clusters.

## Available Flannel Backends

| Backend | Encryption | Performance | Requirements |
|---------|-----------|-------------|-------------|
| `vxlan` (default) | No | Good | None |
| `host-gw` | No | Excellent | L2 network |
| `wireguard-native` | Yes | Very Good | WireGuard kernel modules |
| `ipsec` (legacy, K3s < v1.27) | Yes | Good | strongSwan (`swanctl` + `charon`) |
| `none` | N/A | N/A | Custom CNI |

## Configuring the Flannel Backend

Set Flannel options on server nodes only, and use the same value on every server node in the cluster.

### VXLAN (Default)

VXLAN is the default and most compatible backend. It encapsulates pod traffic in UDP packets:

```yaml
# /etc/rancher/k3s/config.yaml

flannel-backend: "vxlan"
```

```bash
# Install K3s with explicit VXLAN backend
curl -sfL https://get.k3s.io | sudo sh -s - --flannel-backend vxlan

# Verify VXLAN interface was created
ip link show flannel.1
```

**When to use VXLAN:**
- Most environments (cloud, VMs, bare metal)
- When nodes are on different L2 network segments
- When you don't need encryption

### host-gw (Highest Performance)

`host-gw` avoids encapsulation overhead by using the host's routing table:

```yaml
flannel-backend: "host-gw"
```

```bash
# Install with host-gw backend
curl -sfL https://get.k3s.io | sudo sh -s - --flannel-backend host-gw

# Verify routes were added
ip route show | grep "via"
# You should see routes like: 10.42.X.0/24 via NODE_IP
```

**Requirements for host-gw:**
- All nodes must be on the **same L2 broadcast domain** (same subnet)
- Nodes must be able to route directly to each other without a router

**When to use host-gw:**
- Bare metal clusters where all nodes are on the same switch
- Single-site clusters where maximum throughput is needed
- When latency matters (no encapsulation = lower latency)

### WireGuard (Encrypted, Recommended for Security)

WireGuard provides modern, efficient encryption:

```yaml
# Ensure the WireGuard kernel module is available on every node
flannel-backend: "wireguard-native"
```

```bash
# On Ubuntu, install WireGuard if the module/tools are not already present
sudo apt-get install -y wireguard

# Ensure the WireGuard kernel module is available
sudo modprobe wireguard && echo "WireGuard kernel module available"

# Install K3s with WireGuard
curl -sfL https://get.k3s.io | sudo sh -s - --flannel-backend wireguard-native

# Verify WireGuard interface
sudo wg show
```

**When to use WireGuard:**
- Clusters spanning multiple sites or data centers
- Public cloud clusters where node traffic crosses the internet
- Multi-cloud clusters
- Any environment requiring encrypted pod traffic

### IPsec (Legacy Encryption, K3s < v1.27)

IPsec was supported by older K3s releases via strongSwan, but it is not available in K3s v1.27 and higher:

```yaml
# Legacy only: supported on K3s releases earlier than v1.27
flannel-backend: "ipsec"
```

**When to use IPsec:**
- Only when maintaining an older K3s cluster with a requirement for IPsec specifically
- Integration with existing IPsec infrastructure on legacy clusters

### none (Bring Your Own CNI)

Disable Flannel entirely and install your own CNI:

```yaml
flannel-backend: "none"
```

```bash
# Install K3s without CNI
curl -sfL https://get.k3s.io | sudo sh -s - --flannel-backend none --disable-network-policy

# After K3s starts, install your CNI manually
# Example: Cilium
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
    --namespace kube-system \
    --set operator.replicas=1
```

## Switching Backends on an Existing Cluster

Changing the Flannel backend requires a short period of downtime. For the documented migration from legacy `wireguard` or `ipsec` to `wireguard-native`, update the setting on all server nodes, then reboot all nodes starting with the servers:

```bash
# Update config.yaml on every server node
sudo sed -i 's/flannel-backend:.*/flannel-backend: "wireguard-native"/' /etc/rancher/k3s/config.yaml

# Reboot all nodes, starting with the servers
sudo reboot

# After the node returns, verify Flannel started with the new backend
sudo journalctl -u k3s -b | grep -i flannel
```

## Performance Comparison

```bash
# Install iperf3 for network benchmarking
sudo apt-get install -y iperf3

# Run iperf3 server on one pod
kubectl run iperf-server --image=networkstatic/iperf3 --restart=Never --command -- iperf3 -s
kubectl wait --for=condition=Ready pod/iperf-server --timeout=60s

# Run iperf3 client from another pod
IPERF_SERVER_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')
kubectl run iperf-client --image=networkstatic/iperf3 --restart=Never --command -- \
    iperf3 -c "$IPERF_SERVER_IP" -t 10
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/iperf-client --timeout=60s

# View results
kubectl logs iperf-client
```

## Flannel VXLAN MTU Configuration

VXLAN encapsulation reduces the effective MTU. K3s and Flannel handle this automatically; you can inspect the value in use with:

```bash
grep FLANNEL_MTU /run/flannel/subnet.env
```

Check the effective MTU:

```bash
# Check the flannel.1 interface MTU
ip link show flannel.1 | grep mtu

# Check pod network MTU
kubectl run mtu-check --image=busybox --restart=Never --command -- \
    sh -c "cat /sys/class/net/eth0/mtu"
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/mtu-check --timeout=60s
kubectl logs mtu-check
```

## Conclusion

K3s's Flannel backend flexibility allows you to optimize the network for your specific environment. VXLAN is the safe default for cloud and multi-segment networks. Use `host-gw` for maximum performance when all nodes are on the same L2 network. Choose `wireguard-native` when you need encryption with modern performance - it's the best choice for multi-site or cloud deployments. For organizations maintaining older K3s clusters with strict compliance requirements, legacy `ipsec` may still be relevant, but current K3s releases use `wireguard-native` for encrypted Flannel networking. If you need a CNI feature not available in Flannel (like advanced network policies), use `none` and install Calico or Cilium.
