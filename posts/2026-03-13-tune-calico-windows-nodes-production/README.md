# How to Tune Calico on Windows Nodes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Networking, CNI, Performance, Production

Description: A guide to tuning Calico networking performance on Windows Server nodes for production Kubernetes workloads.

---

## Introduction

Tuning Calico on Windows nodes for production focuses on Windows-specific networking parameters rather than the Linux-centric settings like iptables refresh intervals and eBPF enablement. Windows uses HNS (Host Network Service) for container networking, and its performance characteristics differ from Linux's iptables and eBPF. The key tuning areas for Windows are VXLAN MTU optimization, HNS network configuration, and Windows networking stack parameters.

Windows containers also have higher base memory and CPU overhead than Linux containers, so tuning resource requests on Windows Calico components is important for ensuring reliable operation alongside production workloads.

## Prerequisites

- Calico running on Windows and Linux nodes in a Kubernetes cluster
- PowerShell (Administrator) access to Windows nodes
- `kubectl` access from a Linux node

## Step 1: Optimize VXLAN MTU for Windows

Windows VXLAN has the same 50-byte overhead as Linux VXLAN. Set the MTU to avoid fragmentation.

```bash
# On Linux, patch the Installation CR
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

On Windows nodes, verify the HNS network MTU:

```powershell
Get-HnsNetwork | Where-Object { $_.Name -like "*calico*" } | Select-Object Name, Type
```

## Step 2: Tune Windows Networking Stack

```powershell
# Increase TCP receive window
netsh int tcp set supplemental Internet cwnd=10

# Enable RSS (Receive Side Scaling) for multi-core NIC utilization
Enable-NetAdapterRss -Name "<nic-name>"

# Set TCP chimney offload
netsh int tcp set global chimney=enabled
```

## Step 3: Configure Windows Calico Service Resource Limits

Edit the Calico Windows configuration to set appropriate resource limits.

```powershell
# Edit C:\CalicoWindows\config.ps1
$env:CALICO_NODE_CPU_LIMIT = "1"
$env:CALICO_NODE_MEMORY_LIMIT = "512Mi"
```

## Step 4: Optimize HNS Policy Lists

Windows HNS stores all network policies. For large clusters with many policies, HNS can become slow.

```powershell
# Check the number of HNS policy lists
Get-HnsPolicyList | Measure-Object

# If over 500, consider reducing the number of NetworkPolicy objects
```

## Step 5: Enable Windows Performance Counters

```powershell
# Check network performance counters
Get-Counter '\Network Interface(*)\Bytes Received/sec'
Get-Counter '\Network Interface(*)\Bytes Sent/sec'
```

## Step 6: Monitor Calico Performance on Windows

```powershell
# Check calico-node CPU and memory
Get-Process -Name calico-node | Select-Object CPU, WorkingSet
Get-Process -Name felix | Select-Object CPU, WorkingSet
```

## Conclusion

Tuning Calico on Windows nodes for production focuses on VXLAN MTU optimization, Windows TCP stack tuning, HNS policy list management for large clusters, and monitoring the resource usage of the calico-node and felix Windows processes. These Windows-specific parameters complement the cluster-wide Calico tuning settings applied to the Linux control plane.
