# How to Install Calico VPP on Kubernetes Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, CNI, Data Plane, Installation

Description: A step-by-step guide to installing Calico with the VPP (Vector Packet Processor) data plane on a Kubernetes cluster for ultra-high-performance pod networking.

---

## Introduction

Calico VPP is a high-performance data plane option that replaces Calico's default iptables or eBPF data plane with VPP - the Vector Packet Processor. VPP processes packets in user space using a vectorized approach that handles packets in batches, delivering multi-million packets-per-second throughput at low CPU cost. It is designed for workloads that push the limits of Linux kernel networking: telco NFV applications, high-frequency trading, and large-scale service meshes.

Calico VPP runs as a separate process alongside calico-node. It intercepts pod traffic at the kernel-bypass level using DPDK or `af_packet`, process it through VPP's pipeline, and forwards it to the appropriate destination. The installation requires specific hardware support (SR-IOV or DPDK-compatible NICs for best performance) and a kernel configuration that allows VPP to bind to network interfaces.

## Prerequisites

- A Kubernetes cluster with nodes running Linux (Ubuntu 20.04+ or similar)
- Nodes with DPDK-compatible NICs (Intel X710, X722, or similar) for maximum performance
- Hugepages configured on each node
- Calico VPP container images accessible (from Calico VPP GitHub releases)
- `kubectl` with cluster admin access

## Step 1: Configure Hugepages on Nodes

VPP requires hugepages for its memory allocator.

```bash
# On each node
echo 'vm.nr_hugepages = 512' >> /etc/sysctl.d/99-hugepages.conf
sysctl -p /etc/sysctl.d/99-hugepages.conf

# Mount hugetlbfs
mkdir -p /dev/hugepages
mount -t hugetlbfs none /dev/hugepages

# Verify
cat /proc/meminfo | grep Huge
```

## Step 2: Configure Interface for VPP

Identify the interface VPP should take over.

```bash
ip link show
# Note the interface name, e.g., eth1 for the primary data interface
```

## Step 3: Download the Calico VPP Installation Manifests

```bash
# Clone the Calico VPP repository
git clone https://github.com/projectcalico/vpp-dataplane.git
cd vpp-dataplane
git checkout <calico-vpp-version>
```

## Step 4: Configure the VPP Installation

Edit the configuration to specify your interface and driver.

```bash
cp config/calicovpp_agent_config.yaml config/calicovpp_agent_config_local.yaml
```

```yaml
# config/calicovpp_agent_config_local.yaml
vppIface: eth1
dpdkDriver: "vfio-pci"
hugepagesDirBase: "/dev/hugepages"
```

## Step 5: Deploy Calico with VPP Data Plane

```bash
kubectl apply -f yaml/calico-vpp.yaml
```

Monitor the rollout:

```bash
kubectl get pods -n calico-vpp-dataplane -w
kubectl get pods -n kube-system -l k8s-app=calico-node -w
```

## Step 6: Verify VPP Is Running

```bash
kubectl get pods -n calico-vpp-dataplane
kubectl exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface
```

## Conclusion

Installing Calico VPP requires configuring hugepages on nodes, selecting the data interface for VPP to manage, deploying the Calico VPP manifests, and verifying that VPP is processing packets. The installation is more involved than standard Calico, but the resulting throughput - millions of packets per second per core - makes it the right choice for performance-critical Kubernetes workloads.
