# How to Troubleshoot Persistent Volume Claims in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, Persistent Volume

Description: A comprehensive troubleshooting guide for diagnosing and resolving common Persistent Volume Claim issues in Rancher-managed Kubernetes clusters.

Persistent Volume Claims (PVCs) are the primary way applications request storage in Kubernetes. When PVCs fail to bind or mount, workloads cannot start. This guide provides a systematic approach to diagnosing and fixing common PVC issues in Rancher-managed clusters.

## Prerequisites

- A running Rancher instance
- kubectl access to the affected cluster
- Basic understanding of Kubernetes storage concepts

## Step 1: Check PVC Status

Start by examining the PVC status:

```bash
kubectl get pvc -n <namespace>
kubectl describe pvc <pvc-name> -n <namespace>
```

Common PVC states:
- **Pending**: PVC is waiting for a PV to bind
- **Bound**: PVC is successfully bound to a PV
- **Lost**: The PVC has lost its bound PV reference, often because the PV was deleted or became unavailable

## Step 2: Troubleshoot Pending PVCs

A Pending PVC is the most common issue. Check the events:

```bash
kubectl describe pvc <pvc-name> -n <namespace> | tail -20
```

### No Matching PV Found

If using static provisioning, check that a PV exists with matching criteria:

```bash
kubectl get pv

# Check PV details

kubectl get pv -o custom-columns='NAME:.metadata.name,CAPACITY:.spec.capacity.storage,ACCESS:.spec.accessModes,CLASS:.spec.storageClassName,STATUS:.status.phase'
```

Common mismatches:
- Access modes differ (RWO vs RWX)
- Storage class names do not match
- PV capacity is less than PVC request
- PV is already bound to another PVC

### StorageClass Not Found

```bash
# Check if the referenced StorageClass exists
kubectl get storageclass

# Check the PVC's requested StorageClass
kubectl get pvc <pvc-name> -n <namespace> -o jsonpath='{.spec.storageClassName}'
```

If the StorageClass does not exist, create it or recreate the PVC to reference an existing one.

### No Default StorageClass

If the PVC does not specify a StorageClass and there is no default, the claim remains without a class and dynamic provisioning will not happen until you specify one or a default becomes available:

```bash
# Check for default StorageClass
kubectl get storageclass -o custom-columns='NAME:.metadata.name,DEFAULT:.metadata.annotations.storageclass\.kubernetes\.io/is-default-class'

# Set a default
kubectl patch storageclass <class-name> -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'
```

### Provisioner Not Running

```bash
# Check CSI driver pods
kubectl get pods --all-namespaces | grep -i csi

# Check provisioner logs
kubectl logs -n kube-system <csi-controller-pod> --tail=50
```

If the provisioner pods are not running, reinstall the CSI driver.

## Step 3: Troubleshoot WaitForFirstConsumer Binding

PVCs with `volumeBindingMode: WaitForFirstConsumer` stay Pending until a pod uses them:

```bash
kubectl get storageclass <class-name> -o jsonpath='{.volumeBindingMode}'
```

If this returns `WaitForFirstConsumer`, the PVC is expected to be Pending until a pod that uses it is created and scheduled.

## Step 4: Troubleshoot Mount Failures

If a PVC is Bound but the pod cannot mount it:

```bash
kubectl describe pod <pod-name> -n <namespace> | grep -A 10 Events
kubectl get events -n <namespace> --field-selector involvedObject.name=<pod-name>
```

### FailedAttachVolume

```plaintext
Warning  FailedAttachVolume  Unable to attach or mount volumes
```

Causes and solutions:
- Volume is attached to another node (for RWO volumes)
- Node has reached maximum attached volume limit
- Cloud provider API errors

```bash
# Check where the volume is currently attached
kubectl get volumeattachments | grep <pv-name>

# Check node volume limits
kubectl describe node <node-name> | grep -A 5 "Allocatable"
```

### FailedMount

```plaintext
Warning  FailedMount  MountVolume.MountDevice failed
```

Causes and solutions:
- Filesystem corruption
- Missing node packages (for example, NFS or iSCSI client utilities)
- Permission issues

```bash
# Check node logs (SSH to the node)
journalctl -u kubelet | grep -i mount | tail -20

# Verify required packages (package names vary by distro)
dpkg -l | grep -E 'nfs-common|open-iscsi'
rpm -qa | grep -E 'nfs-utils|iscsi-initiator-utils'
```

## Step 5: Troubleshoot Volume Detach Issues

Sometimes pods get stuck terminating because the volume cannot detach:

```bash
# Check for stuck VolumeAttachments
kubectl get volumeattachments

# Delete only after confirming the storage backend no longer shows the volume as attached
kubectl delete volumeattachment <name>

# Check the node for stuck mounts
# SSH to the node:
mount | grep <pv-name>
```

## Step 6: Troubleshoot PV Reclaim Issues

PVs stuck in Released state after PVC deletion:

```bash
kubectl get pv | grep Released
```

To make a Released PV available again:

```bash
# Remove the claimRef (allows rebinding)
kubectl patch pv <pv-name> -p '{"spec":{"claimRef": null}}'
```

For PVs with Retain policy, manually clean up data and remove the claimRef.

## Step 7: Troubleshoot Zone/Topology Issues

For zonal volumes, volumes and pods must be in the same zone:

```bash
# Check PV topology
kubectl describe pv <pv-name> | grep -A 5 "Node Affinity"

# Check pod scheduling
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Node-Selectors"

# Check node zones
kubectl get nodes -L topology.kubernetes.io/zone
```

Fix: Use `volumeBindingMode: WaitForFirstConsumer` in the StorageClass to ensure the volume is created in the same zone as the pod.

## Step 8: Troubleshoot Quota Issues

PVC creation fails due to resource quotas:

```bash
# Check quota usage
kubectl describe resourcequota -n <namespace>

# Check if there is a LimitRange
kubectl describe limitrange -n <namespace>
```

If quota is exceeded, either delete unused PVCs or request a quota increase.

## Step 9: Common Error Messages and Solutions

**"no persistent volumes available for this claim"**
- No PV matches the PVC criteria
- Check access modes, storage class, and capacity

**"storageclass.storage.k8s.io not found"**
- StorageClass does not exist
- Check for typos in the StorageClass name

**"exceeded quota"**
- ResourceQuota limit reached
- Delete unused PVCs or increase the quota

**"volume is already exclusively attached"**
- RWO volume is mounted on another node
- Delete the pod using it or use RWX access mode

**"waiting for a volume to be created"**
- CSI provisioner is not running or has errors
- Check provisioner pod logs

**"failed to provision volume with StorageClass"**
- Backend storage error
- Check CSI driver logs and backend connectivity

## Step 10: Diagnostic Commands Reference

```bash
# Full PVC diagnostic
kubectl get pvc --all-namespaces -o wide
kubectl get pv -o wide

# Check events
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | grep -i -E "volume|pvc|pv|mount|attach"

# CSI driver status
kubectl get csidrivers
kubectl get csinodes

# Volume attachments
kubectl get volumeattachments

# Storage classes
kubectl get storageclass

# Resource quotas
kubectl get resourcequota --all-namespaces

# Node capacity and allocations
kubectl describe nodes | grep -A 10 "Allocated resources"

# Kubelet logs on a node (SSH required)
journalctl -u kubelet | grep -i "volume\|mount\|pvc" | tail -50
```

## Troubleshooting Checklist

1. Is the PVC in Pending, Bound, or Lost state?
2. Does a matching StorageClass exist?
3. Is the CSI driver/provisioner running?
4. Is the volumeBindingMode set to WaitForFirstConsumer?
5. Is there a ResourceQuota limiting storage?
6. Are access modes compatible?
7. Is the volume in the correct availability zone?
8. Are required packages installed on nodes?
9. Are there stuck VolumeAttachments?
10. Does the backend storage have available capacity?

## Summary

Troubleshooting PVCs in Rancher requires systematically checking the PVC status, StorageClass configuration, CSI driver health, and backend storage availability. Most issues fall into a few categories: missing StorageClasses, provisioner failures, quota limits, or zone mismatches. Using the diagnostic commands and checklist in this guide, you can quickly identify and resolve storage issues in your Rancher-managed clusters.
