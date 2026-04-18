# How to Configure VXLAN Overlay in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, VXLAN, Network Overlay, Flannel, Calico, Kubernetes

Description: Configure VXLAN overlay networking in Rancher for pod-to-pod communication across nodes without requiring L2 adjacency between Kubernetes nodes.

## Introduction

VXLAN (Virtual Extensible LAN) is the most common overlay network technology used in Kubernetes. It encapsulates pod network traffic in UDP packets, enabling pods on different nodes to communicate as if they were on the same L2 network, even when the underlying network only provides L3 connectivity.

## VXLAN vs Host-Gateway

| Mode | Requirement | Performance | Use Case |
|---|---|---|---|
| VXLAN | L3 reachability | Moderate (UDP overhead) | Cloud, multi-subnet |
| Host-gateway | L2 adjacency required | High (no encapsulation) | On-premises, same subnet |

## Step 1: Configure Flannel VXLAN

Flannel's VXLAN backend is the default for most RKE2 clusters:

```yaml
# RKE2 cluster config

cni: flannel
flannel-backend: vxlan

# Or override the built-in rke2-canal chart (Canal = Calico + Flannel)
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-canal
  namespace: kube-system
spec:
  valuesContent: |-
    flannel:
      backend: "vxlan"
      iface: "eth0"    # Interface to use for VXLAN
```

## Step 2: Configure Calico VXLAN

```yaml
# calico-vxlan-config.yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
      - blockSize: 26
        cidr: 10.244.0.0/16
        encapsulation: VXLAN       # Use VXLAN encapsulation
        natOutgoing: Enabled
        nodeSelector: all()
```

## Step 3: Tune VXLAN MTU

VXLAN adds 50 bytes of overhead to each packet. Configure MTU to prevent fragmentation:

```bash
# For Flannel VXLAN on a 1500 MTU network
# Flannel sets the VXLAN interface MTU to 1450 automatically

# Verify VXLAN interface MTU
ip link show flannel.1
# flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue

# For jumbo frame networks (9000 MTU)
# VXLAN MTU = 9000 - 50 = 8950
```

## Step 4: Configure VXLAN Port

By default, VXLAN uses UDP port 8472 (Flannel) or 4789 (Calico):

```bash
# Configure firewall rules to allow VXLAN traffic
# Between all Kubernetes nodes
iptables -A INPUT -p udp --dport 8472 -j ACCEPT   # Flannel
iptables -A INPUT -p udp --dport 4789 -j ACCEPT   # Calico VXLAN
```

## Step 5: Troubleshoot VXLAN Connectivity

```bash
# Check if VXLAN interface exists
ip link show flannel.1

# Check VXLAN FDB (forwarding database)
bridge fdb show dev flannel.1

# Test VXLAN connectivity between nodes
kubectl run nettest --image=busybox --rm -it -- ping 10.244.1.5

# Check for MTU issues (fragmentation)
tcpdump -i flannel.1 -nn 'udp port 8472'
```

## Conclusion

VXLAN overlay in Rancher provides flexible pod networking that works across any L3-routable network topology. While it adds 50 bytes of overhead per packet, modern hardware handles this efficiently. For latency-critical workloads, consider host-gateway mode (when L2 adjacency is available) or SR-IOV for hardware-accelerated networking.
