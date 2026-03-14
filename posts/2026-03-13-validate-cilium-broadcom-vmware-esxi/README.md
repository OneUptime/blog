# Validate Cilium on Broadcom VMware ESXi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, VMware, NSX, eBPF

Description: A practical guide to validating Cilium CNI on Kubernetes clusters running on Broadcom VMware ESXi, covering eBPF compatibility, networking requirements, and connectivity validation.

---

## Introduction

Running Cilium on Kubernetes clusters hosted on VMware ESXi introduces specific considerations around eBPF kernel requirements, vSwitch configuration, and network interface compatibility. ESXi's virtual networking layer must be configured to pass traffic correctly to allow Cilium's eBPF programs to function, particularly for features like kube-proxy replacement and transparent encryption.

Validating Cilium on ESXi requires checking the Linux kernel version on guest VMs, verifying that promiscuous mode and forged transmit settings are correctly configured on the vSwitch or distributed virtual switch (DVS), and confirming that eBPF programs load successfully on all nodes.

This guide covers the ESXi-specific validation steps alongside standard Cilium health checks, helping infrastructure teams confirm that their VMware-hosted Kubernetes clusters are correctly configured for Cilium.

## Prerequisites

- VMware ESXi 7.0 or 8.0 with vSphere
- Kubernetes cluster running as VMs on ESXi
- Linux kernel 4.19+ on guest VMs (5.10+ recommended for full Cilium feature set)
- `kubectl` cluster-admin access
- `cilium` CLI installed
- vSphere or vCenter access for vSwitch configuration

## Step 1: Verify eBPF Kernel Support on Guest VMs

Check that the kernel version on each node supports the Cilium features you intend to use.

```bash
# Check kernel versions on all nodes
kubectl get nodes -o jsonpath=\
'{range .items[*]}{.metadata.name}: {.status.nodeInfo.kernelVersion}{"\n"}{end}'

# Verify eBPF filesystem is mounted
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  mount | grep bpf

# Check Cilium's eBPF map status
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  cilium bpf maps list
```

## Step 2: Check vSwitch Configuration for Promiscuous Mode

ESXi requires specific vSwitch settings for certain Cilium features.

```bash
# From an ESXi host or vCenter, verify port group security settings
# The following settings may be required depending on your Cilium configuration:
# - Promiscuous Mode: Accept (required for some direct routing modes)
# - Forged Transmits: Accept (required if Cilium uses virtual MAC addresses)
# - MAC Address Changes: Accept (sometimes required)

# Check via ESXCLI on each host (run on ESXi host):
# esxcli network vswitch standard portgroup policy security get -p <portgroup-name>
```

## Step 3: Validate Cilium Agent Health on All Nodes

```bash
# Check all Cilium DaemonSet pods are running
kubectl -n kube-system get pods -l k8s-app=cilium -o wide

# Use Cilium CLI for health summary
cilium status --wait

# Check Cilium logs for eBPF program load errors
kubectl -n kube-system logs -l k8s-app=cilium --tail=50 | \
  grep -i "error\|failed\|bpf"
```

## Step 4: Validate MTU Configuration

VMware virtual networking and Cilium both affect MTU - misconfiguration causes silent packet drops.

```bash
# Check MTU on node network interfaces
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  ip link show | grep mtu

# Check Cilium's configured MTU
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.mtu}'

# For Cilium with VXLAN on ESXi: MTU should be ethernet MTU - 50 bytes
# For pure routing (no encapsulation): can use full MTU
```

## Step 5: Run Connectivity Tests

```bash
# Run the Cilium connectivity test suite
cilium connectivity test

# Test cross-node pod communication specifically
# (cross-VM traffic must traverse ESXi vSwitch)
kubectl run pod-a --image=nicolaka/netshoot --overrides='{"spec":{"nodeName":"esxi-node-1"}}' -- sleep 3600
kubectl run pod-b --image=nicolaka/netshoot --overrides='{"spec":{"nodeName":"esxi-node-2"}}' -- sleep 3600

POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c 4 $POD_B_IP
```

## Best Practices

- Always validate kernel version compatibility before deploying Cilium on ESXi guest VMs
- Set MTU conservatively (1450) to account for ESXi virtual networking overhead when using encapsulation
- Use Cilium's native routing mode with BGP if your vSwitch supports it - it avoids encapsulation overhead
- Document vSwitch security policy settings and include them in your ESXi host provisioning runbooks
- Enable Hubble for observability so you can quickly correlate Cilium drops with vSwitch issues

## Conclusion

Validating Cilium on VMware ESXi requires attention to both the VMware infrastructure layer (vSwitch settings, MTU) and the Cilium software layer (eBPF program loading, agent health). When both layers are correctly configured and validated, Cilium provides high-performance networking and policy enforcement for Kubernetes workloads on ESXi with full eBPF capabilities.
