# Upgrade Cilium on Broadcom VMware ESXi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, VMware, NSX, eBPF

Description: A guide to upgrading Cilium on Kubernetes clusters running on Broadcom VMware ESXi hypervisors, covering vSphere-specific networking considerations and the upgrade procedure.

---

## Introduction

Running Kubernetes on VMware ESXi with Cilium as the CNI is common in enterprise environments that have standardized on VMware's virtualization infrastructure. Upgrading Cilium in this environment requires understanding how vSphere's virtual networking - including VMware NSX, distributed virtual switches (DVS), and VXLAN support - interacts with Cilium's dataplane.

VMware ESXi's virtualization layer can affect Cilium's eBPF programs due to how the hypervisor presents hardware capabilities to VMs. Most modern ESXi deployments with VMXNET3 network adapters and hardware virtualization extensions support Cilium's full feature set, but confirming hardware capability passthrough is an essential pre-upgrade step.

This guide covers Cilium upgrade procedures for Kubernetes clusters on VMware ESXi, including vSphere-specific pre-upgrade checks and validation of Cilium features after the upgrade.

## Prerequisites

- Kubernetes cluster on VMware ESXi VMs
- vSphere administrator access
- `kubectl` with cluster-admin permissions
- `cilium` CLI installed
- SSH access to Kubernetes node VMs

## Step 1: Verify ESXi and VM Hardware Compatibility

Check that VMs support the hardware features Cilium requires.

```bash
# Check kernel version on VMs (should be 4.9+ for basic Cilium, 5.3+ for eBPF)
kubectl get nodes \
  -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion,OS:.status.nodeInfo.osImage"

# Check hardware virtualization on VMs
ssh <vm-node-ip> "grep -m 1 vmx /proc/cpuinfo | cut -d: -f2"

# Verify VMXNET3 adapter is in use (required for optimal Cilium performance)
ssh <vm-node-ip> "lspci | grep -i vmxnet"

# Check BPF filesystem mount status
ssh <vm-node-ip> "mount | grep bpf"
```

## Step 2: Pre-Upgrade Cilium Health Check

Validate current Cilium state before upgrading.

```bash
# Check current Cilium version
cilium version

# Run full Cilium status check
cilium status --verbose

# Verify all Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Check connectivity is working
cilium connectivity test --test pod-to-pod
```

## Step 3: Backup Configuration

Back up all Cilium and cluster networking configuration.

```bash
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

# Export Cilium ConfigMap
kubectl get configmap -n kube-system cilium-config \
  -o yaml > esxi-cilium-config-backup-$BACKUP_DATE.yaml

# Export CiliumNetworkPolicies
kubectl get ciliumnetworkpolicies -A \
  -o yaml > esxi-cilium-cnp-backup-$BACKUP_DATE.yaml

# Export Cilium node annotations
kubectl get ciliumnodes -o yaml > esxi-cilium-nodes-backup-$BACKUP_DATE.yaml

# Take VM snapshots before upgrade (from vSphere)
# Use VMware vSphere API or vCenter UI to snapshot all Kubernetes VMs
echo "Remember to take VM snapshots from vCenter before proceeding"
```

## Step 4: Execute the Cilium Upgrade

Perform the rolling upgrade using Helm or the cilium CLI.

```bash
# Upgrade using Helm
helm repo add cilium https://helm.cilium.io/
helm repo update

# Check what changes will be made
helm diff upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version 1.15.0 \
  --reuse-values

# Execute the upgrade
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version 1.15.0 \
  --reuse-values \
  --atomic \
  --timeout 15m

# Monitor the DaemonSet rolling update across all nodes
kubectl rollout status daemonset/cilium -n kube-system --timeout=15m

# Watch pod updates in real time
kubectl get pods -n kube-system -l k8s-app=cilium -w
```

## Step 5: Post-Upgrade VMware-Specific Validation

Verify Cilium is working correctly on the ESXi-backed nodes.

```bash
# Verify new Cilium version
cilium version

# Check eBPF programs are loaded correctly
# On a node: verify BPF programs are attached
kubectl exec -n kube-system $(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1) -- \
  cilium bpf policy list

# Run Cilium connectivity test suite
cilium connectivity test

# Check that VXLAN tunnels are up (if using VXLAN mode)
kubectl exec -n kube-system $(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1) -- \
  cilium status --verbose | grep -i vxlan

# Verify cross-host pod connectivity between VMs on different ESXi hosts
kubectl run vmware-test --image=busybox --rm -it --restart=Never -- \
  ping -c 5 <pod-on-different-host>
```

## Best Practices

- Take VM snapshots before Cilium upgrades for quick rollback capability
- Verify VMXNET3 is the VM network adapter - E1000/E1000e have reduced performance with Cilium
- If running VMware NSX, coordinate Cilium upgrades with NSX configuration changes
- Disable VMware Fault Tolerance on Kubernetes VMs during upgrade - FT can cause unexpected node behavior
- Monitor vCenter for VM network performance metrics during the rolling upgrade

## Conclusion

Upgrading Cilium on VMware ESXi requires attention to VM hardware configuration and vSphere networking compatibility. By verifying hardware virtualization features, taking VM snapshots before the upgrade, using Helm's atomic upgrade, and running the Cilium connectivity test suite post-upgrade, you ensure a successful upgrade that maintains Cilium's full feature set on your vSphere-based Kubernetes infrastructure.
