# How to Troubleshoot VM Boot Issues in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Troubleshooting, VMs, KubeVirt

Description: A practical guide to diagnosing and resolving virtual machine boot failures in Harvester, covering common causes and step-by-step resolution.

## Introduction

VM boot issues in Harvester can range from VMs that never start, to VMs that start but fail to boot the OS, to VMs that appear running but are unreachable. Effective troubleshooting requires checking multiple layers: the Kubernetes resource state, the KubeVirt VMI status, the virt-launcher pod logs, and ultimately the VM console output. This guide provides a systematic approach to diagnosing and fixing VM boot problems.

## VM Lifecycle States

Before troubleshooting, understand that Harvester surfaces state at multiple layers:

```text
VirtualMachine: Stopped → Starting → Running
VirtualMachineInstance: Pending → Scheduling → Scheduled → Running → Succeeded/Failed
virt-launcher Pod: Pending → Running → Succeeded/Failed
```

States like `CrashLoopBackOff` surface on the `virt-launcher` pod or its containers, not on the `VirtualMachine` object itself.

## Step 1: Check VM and VMI Status

```bash
# Check the VirtualMachine resource

kubectl get vm -n default

# Check the running instance (VMI)
kubectl get vmi -n default

# Get detailed VM status
kubectl describe vm ubuntu-web-01 -n default

# Get detailed VMI status (most useful for boot issues)
kubectl describe vmi ubuntu-web-01 -n default

# Look at recent events
kubectl get events -n default \
    --field-selector involvedObject.name=ubuntu-web-01 \
    --sort-by='.lastTimestamp'
```

**Common status fields to check:**
- `vm.status.printableStatus`: High-level VM state such as `Starting`, `Running`, or `Stopped`
- `vmi.status.phase`: Should be `Running` for a healthy, booted instance
- `vmi.status.conditions`: Look for any conditions with `status: "False"` and read the related `reason` and `message`

## Step 2: Check the virt-launcher Pod

Each running VMI has a corresponding `virt-launcher` pod. This is where most boot issues surface:

```bash
# Find the virt-launcher pod for the VM
kubectl get pods -n default -l vm.kubevirt.io/name=ubuntu-web-01

# Check pod status
kubectl describe pod -n default \
    "$(kubectl get pods -n default -l vm.kubevirt.io/name=ubuntu-web-01 \
        -o jsonpath='{.items[0].metadata.name}')"

# Get pod logs (QEMU/KVM output)
kubectl logs -n default \
    "$(kubectl get pods -n default -l vm.kubevirt.io/name=ubuntu-web-01 \
        -o jsonpath='{.items[0].metadata.name}')" \
    -c compute

# Follow logs in real-time
kubectl logs -n default \
    "$(kubectl get pods -n default -l vm.kubevirt.io/name=ubuntu-web-01 \
        -o jsonpath='{.items[0].metadata.name}')" \
    -c compute -f
```

## Step 3: Access the VM Console

The VM console shows exactly what's happening during boot:

```bash
# Connect to the VM console
virtctl console ubuntu-web-01 -n default

# Press Enter if the console shows nothing
# Use Ctrl+] to exit the console

# For VNC console access (requires remote-viewer on your workstation)
virtctl vnc ubuntu-web-01 -n default
```

## Common Issues and Solutions

### Issue 1: VM Stuck in "Pending" State

**Symptoms:** `vmi` shows `Pending` or `Scheduling` for extended time

**Cause:** Insufficient resources, node selector mismatch, or PVC not bound

```bash
# Check why the pod is pending
kubectl get pod -n default \
    "$(kubectl get pods -n default -l vm.kubevirt.io/name=ubuntu-web-01 \
        -o jsonpath='{.items[0].metadata.name}')" \
    -o wide

# Check pod events for scheduling failures
kubectl describe pod -n default \
    "$(kubectl get pods -n default -l vm.kubevirt.io/name=ubuntu-web-01 \
        -o jsonpath='{.items[0].metadata.name}')" | \
    grep -A 20 "Events:"

# Common scheduling messages:
# "Insufficient memory" - node doesn't have enough RAM
# "PersistentVolumeClaim is not bound" - the boot disk PVC isn't ready

# Check PVC status
kubectl get pvc -n default | grep ubuntu-web-01

# If PVC is Pending, check Longhorn
kubectl get volumes.longhorn.io -n longhorn-system | grep ubuntu-web-01
```

**Fix for resource issues:**
```bash
# Check available resources on each node
kubectl describe nodes | grep -A 5 "Allocated resources"

# Reduce VM CPU/memory or add more nodes
kubectl patch vm ubuntu-web-01 -n default \
    --type merge \
    -p '{"spec":{"template":{"spec":{"domain":{"resources":{"requests":{"memory":"4Gi"}}}}}}}'
```

---

### Issue 2: VM Starts But OS Doesn't Boot

**Symptoms:** VM shows `Running` but console shows GRUB errors or no OS boot

**Cause:** Corrupted disk image, wrong boot order, BIOS vs UEFI mismatch

```bash
# Access the console to see the boot sequence
virtctl console ubuntu-web-01 -n default

# In the console, look for:
# - GRUB errors: "error: file '/grub/grub.cfg' not found"
# - No boot media: "No bootable device"
# - Kernel panic: kernel issues

# Check if the VM image was imported correctly
kubectl describe virtualmachineimage ubuntu-22-04-lts -n default | \
    grep -A 10 "Status:"
```

**Fix for boot order issues:**
```bash
# Ensure the boot disk has bootOrder: 1 set
# Adjust the disk index if the boot disk is not disks[0]
kubectl patch vm ubuntu-web-01 -n default \
    --type json \
    -p '[{
        "op": "add",
        "path": "/spec/template/spec/domain/devices/disks/0/bootOrder",
        "value": 1
    }]'
```

**Fix for UEFI vs BIOS mismatch:**
```yaml
# If the image was created with UEFI but VM is configured for BIOS:
# Add UEFI firmware configuration

apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: ubuntu-web-01
spec:
  template:
    spec:
      domain:
        firmware:
          bootloader:
            efi:
              secureBoot: false  # Disable secure boot if the image does not support it
```

---

### Issue 3: Cloud-Init Failure

**Symptoms:** VM boots but SSH access fails, expected software not installed, network not configured

**Cause:** Cloud-init configuration error or syntax issue

```bash
# Access the console and check cloud-init status
virtctl console ubuntu-web-01 -n default

# Inside the VM:
cloud-init status --long
cat /var/log/cloud-init-output.log
journalctl -u cloud-init

# Re-run cloud-init (for debugging - don't use in production)
sudo cloud-init clean --logs --reboot
```

**Validate cloud-init syntax before applying:**
```bash
# Install cloud-init on your workstation for validation
cloud-init schema --config-file ./my-userdata.yaml --annotate
```

---

### Issue 4: virt-launcher Pod CrashLoopBackOff

**Symptoms:** `virt-launcher` enters `CrashLoopBackOff`, or the VM starts and immediately exits

**Cause:** QEMU/KVM error, hardware emulation issue, or OOM

```bash
# Check the virt-launcher pod restart count
kubectl get pod -n default -l vm.kubevirt.io/name=ubuntu-web-01

# Get logs from the previous pod run
kubectl logs -n default \
    "$(kubectl get pods -n default -l vm.kubevirt.io/name=ubuntu-web-01 \
        -o jsonpath='{.items[0].metadata.name}')" \
    -c compute --previous

# On the Harvester node hosting the virt-launcher pod, check for OOM events
sudo dmesg | grep -i oom
kubectl get events -n default | grep -i oom

# Check for QEMU or node-side virtualization errors in the virt-handler logs
NODE=$(kubectl get vmi ubuntu-web-01 -n default -o jsonpath='{.status.nodeName}')

kubectl logs -n harvester-system \
    "$(kubectl get pods -n harvester-system -l kubevirt.io=virt-handler \
        --field-selector spec.nodeName=${NODE} \
        -o jsonpath='{.items[0].metadata.name}')" | \
    grep -E "ERROR|WARN|panic" | tail -50
```

---

### Issue 5: VM Network Not Working

**Symptoms:** VM boots but cannot reach the network

**Cause:** Network interface not configured, cloud-init network config issue, or NetworkAttachmentDefinition misconfiguration

```bash
# In the VM console, check network interface status
ip addr show
ip route show
cat /etc/resolv.conf

# Check if the network interface name changed
# Ubuntu 22.04 uses enp1s0, enp2s0 etc.
# Some cloud images may use eth0 - verify in cloud-init

# Verify the NAD (NetworkAttachmentDefinition) is correct
kubectl get network-attachment-definitions.k8s.cni.cncf.io -n default

# Check the VMI for network details
kubectl get vmi ubuntu-web-01 -n default \
    -o jsonpath='{.status.interfaces}'
```

## Systematic Debug Process

```bash
#!/bin/bash
# vm-debug.sh - Collect all relevant debug info for a VM issue

VM_NAME="${1:-ubuntu-web-01}"
NAMESPACE="${2:-default}"

echo "=== Debug info for VM: ${VM_NAME} in namespace: ${NAMESPACE} ==="
echo ""

echo "--- VM Status ---"
kubectl get vm ${VM_NAME} -n ${NAMESPACE} -o wide

echo "--- VMI Status ---"
kubectl get vmi ${VM_NAME} -n ${NAMESPACE} -o wide 2>/dev/null || echo "No VMI found"

echo "--- VM Events ---"
kubectl get events -n ${NAMESPACE} \
    --field-selector involvedObject.name=${VM_NAME} \
    --sort-by='.lastTimestamp' | tail -20

echo "--- virt-launcher Pod ---"
POD=$(kubectl get pods -n ${NAMESPACE} \
    -l vm.kubevirt.io/name=${VM_NAME} \
    -o name 2>/dev/null | head -1)

if [ -n "$POD" ]; then
    kubectl get ${POD} -n ${NAMESPACE}
    echo "--- Pod Events ---"
    kubectl describe ${POD} -n ${NAMESPACE} | grep -A 10 "Events:"
    echo "--- Pod Logs (last 50 lines) ---"
    kubectl logs ${POD} -n ${NAMESPACE} -c compute --tail=50
else
    echo "No virt-launcher pod found"
fi

echo "--- Root PVC Status ---"
kubectl get pvc -n ${NAMESPACE} | grep ${VM_NAME}
```

## Conclusion

Troubleshooting VM boot issues in Harvester requires a layered approach: start with Kubernetes resource states, move to pod logs, and finally use the VM console for OS-level diagnosis. The most common issues are insufficient resources, PVC problems, cloud-init errors, and network misconfiguration. Developing familiarity with `virtctl console`, `kubectl describe vmi`, and virt-launcher pod logs will make you effective at diagnosing and resolving the vast majority of VM boot issues.
