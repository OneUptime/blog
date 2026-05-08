# How to Tune Calico VPP on Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, CNI, Performance, Production

Description: A guide to tuning Calico VPP's data plane parameters for maximum throughput and minimum latency in production Kubernetes clusters.

---

## Introduction

Production tuning for Calico VPP focuses on maximizing VPP's packet processing throughput and minimizing latency. VPP's performance is highly sensitive to its memory configuration (hugepages and buffer sizes), CPU allocation (worker threads and core pinning), and the quality of the NIC driver binding.

VPP's vectorized processing model means that performance improves when the dataplane can process packets efficiently in batches. Tuning buffer counts, worker threads, queue counts, and the selected uplink driver are the primary levers for maximizing throughput.

## Prerequisites

- Calico VPP installed on a Kubernetes cluster
- Nodes with NICs supported by the VPP driver you plan to use
- Hugepages configured when using DPDK or native VPP drivers (Calico's general guidance is at least 512 2MB pages per node)
- `kubectl` with cluster admin access

## Step 1: Increase VPP Buffer Pool

```text
# In the CALICOVPP_CONFIG_TEMPLATE value of the calico-vpp-config ConfigMap

buffers {
  buffers-per-numa 512000
  page-size 2m
}
```

```bash
kubectl -n calico-vpp-dataplane get configmap calico-vpp-config -o yaml > calico-vpp-config.yaml
# Edit CALICOVPP_CONFIG_TEMPLATE in calico-vpp-config.yaml, then apply it.
kubectl apply -f calico-vpp-config.yaml
kubectl -n calico-vpp-dataplane rollout restart daemonset/calico-vpp-node
```

## Step 2: Configure Multiple VPP Workers

```text
# In the CALICOVPP_CONFIG_TEMPLATE value of the calico-vpp-config ConfigMap

cpu {
  workers 4
  main-core 0
  corelist-workers 1-4
}
```

## Step 3: Enable Interrupt Mode (Low Latency)

For latency-sensitive workloads, enable VPP's interrupt mode:

```yaml
# In the CALICOVPP_INTERFACES value of the calico-vpp-config ConfigMap
{
  "uplinkInterfaces": [
    {
      "interfaceName": "eth1",
      "vppDriver": "dpdk",
      "rx": 4,
      "tx": 4,
      "rxMode": "interrupt"
    }
  ]
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

For hardware that supports it, SR-IOV virtual functions can be passed to VPP through a supported driver such as DPDK or a native VPP driver.

```bash
# Enable SR-IOV VFs on the physical NIC
echo 4 > /sys/class/net/eth1/device/sriov_numvfs

# Bind VFs to vfio-pci for DPDK/native VPP driver use
dpdk-devbind.py --bind=vfio-pci <vf-pci-address>
```

## Step 6: Monitor VPP Performance

```bash
kubectl exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show interface
kubectl exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show hardware-interfaces
kubectl exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show runtime
```

The `show runtime` command shows packet processing runtime counters, including average vectors per node, and helps identify bottlenecks.

## Conclusion

Tuning Calico VPP for production involves increasing buffer pool sizes, allocating multiple VPP worker threads with core pinning, enabling NUMA-aware hugepage allocation, and optionally using SR-IOV virtual functions with an appropriate VPP driver. VPP's `show runtime` command provides detailed runtime statistics that help identify where the performance ceiling lies and guide further tuning.
