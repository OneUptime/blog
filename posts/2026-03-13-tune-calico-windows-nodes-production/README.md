# How to Tune Calico on Windows Nodes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Networking, CNI, Performance, Production

Description: A guide to tuning Calico networking performance on Windows Server nodes for production Kubernetes workloads.

---

## Introduction

Tuning Calico on Windows nodes for production focuses on Windows-specific networking parameters rather than the Linux-centric settings like iptables refresh intervals and eBPF enablement. Windows uses HNS (Host Network Service) for container networking, and its performance characteristics differ from Linux's iptables and eBPF. The key tuning areas for Windows are VXLAN MTU optimization, HNS network configuration, and Windows networking stack parameters.

Windows containers also have higher base memory and CPU overhead than Linux containers, so tuning resource requests on Windows Calico components is important for ensuring reliable operation alongside production workloads.

## Prerequisites

- Calico running on Windows and Linux nodes in a Kubernetes cluster
- PowerShell (Administrator) access to Windows nodes
- `kubectl` access from a Linux node

## Step 1: Account for VXLAN MTU on Windows

VXLAN adds 50 bytes of overhead for IPv4 traffic. Calico for Windows supports VXLAN, but current Calico for Windows does not support configuring the Windows VXLAN MTU setting directly. For Linux workloads in the same VXLAN cluster, set the Calico MTU to avoid fragmentation.

```bash
# On Linux, patch the Installation CR

kubectl patch installation.operator.tigera.io default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

On Windows nodes, verify that the Calico HNS network exists and is using the expected network type:

```powershell
Get-HnsNetwork | Where-Object { $_.Name -like "*calico*" } | Select-Object Name, Type
```

## Step 2: Tune Windows Networking Stack

```powershell
# Use TCP receive window auto-tuning
netsh int tcp set global autotuninglevel=normal

# Enable RSS (Receive Side Scaling) for multi-core NIC utilization
Enable-NetAdapterRss -Name "<nic-name>"

# Review the active TCP settings before changing other host-wide options
netsh int tcp show global
```

## Step 3: Configure Windows Calico Service Resource Limits

For operator-managed Calico for Windows, set resources on the `calicoNodeWindowsDaemonSet` in the Installation CR.

```bash
kubectl patch installation.operator.tigera.io default --type merge \
  --patch '{"spec":{"calicoNodeWindowsDaemonSet":{"spec":{"template":{"spec":{"containers":[{"name":"calico-node-windows","resources":{"requests":{"cpu":"100m","memory":"100Mi"},"limits":{"cpu":"1","memory":"1000Mi"}}}]}}}}}}'
```

## Step 4: Optimize HNS Policy Lists

Windows HNS stores network policy state. For large clusters with many policies or complex selectors, HNS policy programming can become slow.

```powershell
# Check the number of HNS policy lists
Get-HnsPolicyList | Measure-Object

# If the count is unexpectedly high, review and reduce NetworkPolicy and Calico policy complexity
```

## Step 5: Check Windows Performance Counters

```powershell
# Check network performance counters
Get-Counter '\Network Interface(*)\Bytes Received/sec'
Get-Counter '\Network Interface(*)\Bytes Sent/sec'
```

## Step 6: Monitor Calico Performance on Windows

```powershell
# Check calico-node CPU and memory
Get-Process -Name calico-node | Select-Object CPU, WorkingSet

# For operator-managed installs, check the Windows DaemonSet resource usage from Kubernetes
kubectl top pod -n calico-system -l k8s-app=calico-node-windows
```

## Conclusion

Tuning Calico on Windows nodes for production focuses on accounting for VXLAN overhead, Windows TCP stack tuning, HNS policy list management for large clusters, and monitoring the resource usage of the Calico Windows node components. These Windows-specific checks complement the cluster-wide Calico tuning settings applied from the Linux control plane.
