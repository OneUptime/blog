# Upgrade Cilium on Broadcom VMware ESXi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, VMware, NSX, eBPF

Description: A guide to upgrading Cilium on Kubernetes clusters running on Broadcom VMware ESXi hypervisors, covering vSphere-specific networking considerations and the upgrade procedure.

---

## Introduction

Running Kubernetes on VMware ESXi with Cilium as the CNI is common in enterprise environments that have standardized on VMware's virtualization infrastructure. Upgrading Cilium in this environment requires understanding how vSphere's virtual networking - including VMware NSX, distributed virtual switches (DVS), and overlay tunnel support - interacts with Cilium's dataplane.

VMware ESXi's virtualization layer can affect Cilium traffic due to virtual NIC driver behavior and tunnel offloads. Cilium's eBPF programs run in the guest Linux kernel, so confirming the node kernel, BPF filesystem, and tunnel settings is an essential pre-upgrade step.

This guide covers Cilium upgrade procedures for Kubernetes clusters on VMware ESXi, including vSphere-specific pre-upgrade checks and validation of Cilium features after the upgrade.

## Prerequisites

- Kubernetes cluster on VMware ESXi VMs
- vSphere administrator access
- `kubectl` with cluster-admin permissions
- `cilium` CLI installed
- Helm installed
- `helm diff` plugin installed if you use the `helm diff upgrade` command
- SSH access to Kubernetes node VMs

## Step 1: Verify ESXi and VM Hardware Compatibility

Check that the node VMs meet Cilium's Linux kernel and networking requirements.

```bash
# Check kernel version on VMs (Cilium 1.19 requires Linux 5.10+ or an equivalent vendor kernel, such as RHEL 8.10's 4.18 kernel)

kubectl get nodes \
  -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion,OS:.status.nodeInfo.osImage"

# Check required BPF-related kernel options
ssh <vm-node-ip> 'grep -E "CONFIG_(BPF|BPF_EVENTS|BPF_SYSCALL|BPF_JIT|NET_CLS_BPF|NET_CLS_ACT|CGROUP_BPF)=" /boot/config-$(uname -r)'

# Verify VMXNET3 adapter is in use (recommended for Cilium performance on VMware)
ssh <vm-node-ip> "lspci | grep -i vmxnet"

# Check BPF filesystem mount status
ssh <vm-node-ip> "mount | grep /sys/fs/bpf"
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

# Export current Helm values for review and reuse during upgrade
helm get values cilium --namespace kube-system -o yaml > esxi-cilium-values-$BACKUP_DATE.yaml
cp esxi-cilium-values-$BACKUP_DATE.yaml cilium-upgrade-values.yaml

# Take VM snapshots before upgrade (from vSphere)
# Use VMware vSphere API or vCenter UI according to your cluster's snapshot and etcd backup policy
echo "If your operations policy allows VM snapshots, take them from vCenter before proceeding"
```

## Step 4: Execute the Cilium Upgrade

Perform the rolling upgrade using Helm. Upgrade one minor release at a time and use the latest patch release for the target minor version.

```bash
TARGET_VERSION=1.19.3
VALUES_FILE=cilium-upgrade-values.yaml

# Upgrade using Helm
helm repo add cilium https://helm.cilium.io/
helm repo update

# Check what changes will be made
helm diff upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version $TARGET_VERSION \
  -f $VALUES_FILE

# Execute the upgrade
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version $TARGET_VERSION \
  -f $VALUES_FILE \
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
  cilium-dbg bpf policy list

# Run Cilium connectivity test suite
cilium connectivity test

# Check that VXLAN tunnels are up (if using VXLAN mode)
kubectl exec -n kube-system $(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1) -- \
  cilium-dbg status --verbose | grep -i vxlan

# Verify cross-host pod connectivity between VMs on different ESXi hosts
kubectl run vmware-test --image=busybox --rm -it --restart=Never -- \
  ping -c 5 <pod-on-different-host>
```

## Best Practices

- Follow your VM snapshot and etcd backup policy before Cilium upgrades for rollback capability
- Verify VMXNET3 is the VM network adapter - E1000/E1000e have reduced performance compared with VMXNET3
- If running VMware NSX with VXLAN tunnel mode, consider using a custom Cilium tunnel port such as `--set tunnelPort=8223` or using Geneve, and coordinate Cilium upgrades with NSX configuration changes
- Disable VMware Fault Tolerance on Kubernetes VMs during upgrade - FT can cause unexpected node behavior
- Monitor vCenter for VM network performance metrics during the rolling upgrade

## Conclusion

Upgrading Cilium on VMware ESXi requires attention to VM hardware configuration and vSphere networking compatibility. By verifying the guest kernel and BPF filesystem, following your snapshot and backup policy before the upgrade, using Helm's atomic upgrade, and running the Cilium connectivity test suite post-upgrade, you ensure a successful upgrade that maintains Cilium networking on your vSphere-based Kubernetes infrastructure.
