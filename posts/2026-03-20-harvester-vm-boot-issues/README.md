# How to Troubleshoot VM Boot Issues in Harvester - Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, VM, Boot Issues, Troubleshooting, KubeVirt, HCI, SUSE Rancher

Description: Learn how to diagnose and fix VM boot failures in Harvester, including cloud-init errors, disk issues, network configuration problems, and VM status debugging.

---

VMs in Harvester may fail to boot due to misconfigured cloud-init, invalid disk images, insufficient resources, or network issues. This guide covers how to identify and resolve the most common VM boot failures.

---

## Step 1: Check VM Status

```bash
# List all VMs and their status

kubectl get vm -A

# Get detailed VM status
kubectl describe vm <vm-name> -n default

# List VM instances (running instances of a VM)
kubectl get vmi -A

# Get VM instance details
kubectl describe vmi <vm-name> -n default
```

---

## Issue 1: VM Stuck in "Starting" State

**Cause**: Usually the VM pod is waiting for resources (CPU, memory, storage).

```bash
# Find the virt-launcher pod for the VM
kubectl get pods -n default -l kubevirt.io/domain=<vm-name>

# Check pod events for scheduling issues
kubectl describe pod <virt-launcher-pod-name> -n default

# Check resource availability
kubectl describe node | grep -A 5 "Allocated resources"
```

---

## Issue 2: VM Fails to Start Due to Disk Error

```bash
# Check if the volume is attached and healthy
kubectl get pvc -n default | grep <vm-name>
kubectl get volumes.longhorn.io -n longhorn-system | grep <pvc-id>

# Check virt-launcher log for disk errors
kubectl logs -n default <virt-launcher-pod-name> -c compute | head -100

# Common error: "Cannot open block device"
# Fix: verify the PVC is bound and the volume is healthy in Longhorn
```

---

## Issue 3: Cloud-init Errors

Cloud-init failures prevent VMs from configuring correctly after boot:

```bash
# Access the VM serial console from Harvester UI
# Virtual Machines > [VM Name] > Console

# Or via virtctl
virtctl console <vm-name> -n default

# Inside the VM, check cloud-init logs
cat /var/log/cloud-init-output.log
cloud-init status --long

# Check for syntax errors in your cloud-init config
# Use this validator:
cloud-init schema --config-file user-data.yaml --annotate
```

---

## Issue 4: VM Boots But Has No Network

```bash
# Check VM network attachment from inside the VM console
ip addr show
ip route show

# Verify the Harvester network is correctly attached
kubectl get vm <vm-name> -n default \
  -o jsonpath='{.spec.template.spec.networks}'

# Check if the bridge or VLAN interface exists on the host node
# On the Harvester node running the VM:
ip link show | grep -E "br-|vlan"

# Verify network attachment definition
kubectl get network-attachment-definitions.k8s.cni.cncf.io -n default
```

---

## Issue 5: VM Created from Image Won't Boot

```bash
# Check if the image was fully downloaded before creating the VM
kubectl get virtualmachineimages -A
kubectl describe virtualmachineimages <image-name> -n default

# Status should show "Initialized: True", "Imported: True", and "Failed: 0"
# If failed, re-upload the image or fix the download URL
```

---

## Step 6: Access VM Console Without Network

If the VM cannot be reached via network:

1. In Harvester UI, go to **Virtual Machines**
2. Click on the VM name
3. Click **Console** to access the serial console
4. Log in with your user credentials or cloud-init user

Or via `virtctl`:

```bash
# Install virtctl
export VERSION=$(curl -Ls https://storage.googleapis.com/kubevirt-prow/release/kubevirt/kubevirt/stable.txt)
curl -L -o virtctl "https://github.com/kubevirt/kubevirt/releases/download/${VERSION}/virtctl-${VERSION}-linux-amd64"
chmod +x virtctl && sudo install -m 0755 virtctl /usr/local/bin/virtctl

virtctl console <vm-name> -n default
```

---

## Best Practices

- Validate cloud-init configuration with `cloud-init schema --config-file user-data.yaml --annotate` before using it in production VMs.
- Keep VM images small and use backing images for base OS layers to speed up provisioning.
- Set VM resource requests/limits to prevent over-committing and VMs starving each other.
