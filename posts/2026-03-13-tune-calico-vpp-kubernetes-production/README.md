# How to Tune Calico VPP on Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, CNI, Performance, Production

Description: A guide to tuning Calico VPP's data plane parameters for maximum throughput and minimum latency in production Kubernetes clusters.

---

## Introduction

Production tuning for Calico VPP focuses on maximizing VPP's packet processing throughput and minimizing latency. VPP's performance is highly sensitive to its memory configuration (hugepages and buffer sizes), CPU allocation (worker threads and core pinning), and the quality of the NIC driver binding. Getting these parameters right can make the difference between 1 Mpps and 10 Mpps packet processing rates.

VPP's vectorized processing model means that performance improves with larger batch sizes (more packets processed per poll cycle). Tuning the `vector-size` parameter and buffer counts is the primary lever for maximizing throughput.

## Prerequisites

- Calico VPP installed on a Kubernetes cluster
- Nodes with DPDK-compatible NICs
- Hugepages configured (at least 1024 2MB pages per node)
- `kubectl` with cluster admin access

## Step 1: Increase VPP Buffer Pool

```yaml
# In vpp.conf ConfigMap
buffers {
  buffers-per-numa 512000
  page-size 2m
}
```

```bash
kubectl patch configmap vpp-config -n calico-vpp-dataplane \
  --patch '{"data":{"buffers-per-numa":"512000"}}'
```

## Step 2: Configure Multiple VPP Workers

```yaml
cpu {
  workers 4
  main-core 0
  corelist-workers 1-4
}
```

## Step 3: Enable Interrupt Mode (Low Latency)

For latency-sensitive workloads, enable VPP's interrupt mode:

```yaml
dpdk {
  dev 0000:01:00.0 {
    num-rx-queues 4
    num-tx-queues 4
  }
}
```

## Step 4: Configure NUMA-Aware Hugepages

For multi-socket servers:

```bash
numactl --hardware
# Allocate hugepages per NUMA node
echo 512 > /sys/devices/system/node/node0/hugepages/hugepages-2048kB/nr_hugepages
echo 512 > /sys/devices/system/node/node1/hugepages/hugepages-2048kB/nr_hugepages
```

## Step 5: Enable SR-IOV for Virtual Functions

For the highest throughput, use SR-IOV virtual functions instead of physical functions.

```bash
# Enable SR-IOV VFs on the physical NIC
echo 4 > /sys/class/net/eth1/device/sriov_numvfs

# Bind VFs to VPP's driver
dpdk-devbind.py --bind=vfio-pci <vf-pci-address>
```

## Step 6: Monitor VPP Performance

```bash
kubectl exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface statistics
kubectl exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show runtime
```

The `show runtime` command shows per-worker packet processing rates and helps identify bottlenecks.

## Conclusion

Tuning Calico VPP for production involves increasing buffer pool sizes, allocating multiple VPP worker threads with core pinning, enabling NUMA-aware hugepage allocation, and optionally using SR-IOV virtual functions for the highest possible throughput. VPP's `show runtime` command provides detailed per-worker statistics that help identify where the performance ceiling lies and guide further tuning.
