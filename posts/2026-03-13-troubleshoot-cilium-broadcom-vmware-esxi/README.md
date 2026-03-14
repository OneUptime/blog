# Troubleshoot Cilium on Broadcom VMware ESXi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, VMware, NSX, EBPF

Description: A troubleshooting guide for diagnosing and resolving issues when running Cilium on Kubernetes clusters deployed on Broadcom VMware ESXi hypervisor infrastructure.

---

## Introduction

Running Kubernetes with Cilium on VMware ESXi-hosted virtual machines presents unique networking challenges. ESXi's virtual networking layer-including virtual switches (vSwitches), distributed virtual switches (DVS), and port groups-can interfere with Cilium's eBPF-based networking if not configured correctly.

The most common issues involve promiscuous mode requirements for overlay networking, MAC address changes being blocked by vSwitch security policies, forged transmits settings affecting pod traffic, and virtual NIC driver limitations that prevent some eBPF features from working.

This guide covers ESXi-specific Cilium troubleshooting procedures.

## Prerequisites

- Kubernetes cluster on VMware ESXi VMs
- Cilium installed on the cluster
- `kubectl` and `cilium` CLI access
- VMware vSphere/vCenter access for ESXi configuration

## Step 1: Configure vSwitch Security Policies for Cilium

ESXi vSwitch security policies must be configured to allow pod networking traffic.

```bash
# These settings must be configured in vSphere for the port group
# used by Kubernetes node VMs:

# Via PowerCLI (run on vCenter):
# Get-VirtualPortGroup -Name "kubernetes-vms-portgroup" |
#   Get-SecurityPolicy |
#   Set-SecurityPolicy -AllowPromiscuous $true -MacChanges $true -ForgedTransmits $true

# Verify the settings via the vSphere UI:
# Host -> Networking -> Virtual Switch -> Port Group -> Security Policy
# - Promiscuous Mode: Accept
# - MAC Address Changes: Accept
# - Forged Transmits: Accept

# Test if Cilium can create overlay interfaces after policy change
kubectl get pods -n kube-system -l k8s-app=cilium
```

## Step 2: Check Virtual NIC Compatibility

Verify that the virtual NIC type supports Cilium's eBPF requirements.

```bash
# Check the virtual NIC type being used on the node VMs
# In vSphere, node VMs should use VMXNET3 for best compatibility

# Check network interface driver on the node
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ethtool -i eth0

# VMXNET3 provides the best compatibility for eBPF offloading
# E1000 may have limitations with some eBPF features

# Verify Cilium status
cilium status
```

## Step 3: Diagnose MTU Issues with VMware vSwitch

VMware vSwitch can have MTU settings that interfere with Cilium's encapsulation.

```bash
# Check the MTU on node network interfaces
kubectl debug node/<node-name> -it --image=ubuntu -- ip link show eth0

# VMware standard vSwitch default MTU is 1500
# Distributed vSwitch (DVS) can support jumbo frames (9000)

# Check Cilium's MTU configuration
kubectl get configmap cilium-config -n kube-system -o yaml | grep mtu

# For standard vSwitch (1500 MTU), configure Cilium appropriately
# VXLAN adds 50 bytes overhead; set Cilium MTU to 1450

kubectl patch configmap cilium-config -n kube-system --type merge \
  --patch '{"data":{"mtu":"1450"}}'
```

## Step 4: Test Pod-to-Pod Connectivity Across ESXi Hosts

Validate that pods on different ESXi hosts can communicate.

```bash
# Schedule pods on nodes on different ESXi hosts
# (Use node labels to target specific ESXi hosts)

kubectl run vm-test-1 --image=busybox --overrides='{"spec":{"nodeName":"<node-on-host-1>"}}' -- sleep 3600
kubectl run vm-test-2 --image=busybox --overrides='{"spec":{"nodeName":"<node-on-host-2>"}}' -- sleep 3600

# Test connectivity
POD2_IP=$(kubectl get pod vm-test-2 -o jsonpath='{.status.podIP}')
kubectl exec vm-test-1 -- ping -c 5 ${POD2_IP}

# If ping fails, check Cilium monitor for drops
CILIUM_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium \
  --field-selector spec.nodeName=<node-on-host-1> \
  -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n kube-system ${CILIUM_POD} -- cilium monitor --type drop
```

## Step 5: Validate eBPF Program Loading on VMXNET3

Ensure eBPF programs load correctly on VMware virtual NICs.

```bash
# Check if eBPF programs are attached to the node's network interface
kubectl exec -n kube-system ${CILIUM_POD} -- \
  cilium debuginfo | grep -i "tc\|xdp\|prog"

# Check for eBPF program loading errors
kubectl logs -n kube-system ${CILIUM_POD} | \
  grep -E "ERROR|xdp|bpf_load" | tail -20

# Run Cilium connectivity test
cilium connectivity test
```

## Best Practices

- Always configure promiscuous mode, MAC address changes, and forged transmits on port groups used by Kubernetes node VMs
- Use VMXNET3 virtual NICs for best Cilium compatibility-avoid E1000 and older adapters
- Enable jumbo frames (9000 MTU) on DVS for optimal performance, eliminating encapsulation overhead
- Test Cilium connectivity after any vSwitch or port group configuration changes
- Document required ESXi/vSphere settings in your cluster provisioning runbooks

## Conclusion

Cilium on VMware ESXi requires specific vSwitch security policy configurations to function correctly. By enabling promiscuous mode and forged transmits, using VMXNET3 NICs, and aligning MTU settings between vSwitches and Cilium, you can run Cilium reliably on VMware infrastructure. Test cross-host pod connectivity after any VMware networking changes.
