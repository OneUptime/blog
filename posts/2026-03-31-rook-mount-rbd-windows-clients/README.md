# How to Mount RBD on Windows Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Window, Block Storage, Kubernetes

Description: Learn how to map and mount Ceph RBD (RADOS Block Device) images on Windows clients for persistent block storage access from Windows workloads.

---

## RBD on Windows

Ceph RADOS Block Device (RBD) images can be mapped on Windows as virtual disks using the Ceph Windows client. Once mapped, they appear as regular Windows disks that can be formatted and used like any attached storage. This enables Windows applications to benefit from Ceph's distributed block storage.

## Prerequisites

Ensure the Ceph Windows client is installed and configured. See the Ceph Windows installation guide for setup instructions.

Verify the client can reach the cluster:

```powershell
ceph status
```

## Creating an RBD Image on the Ceph Cluster

From your Linux management node or Ceph toolbox:

```bash
# Create a pool for Windows clients
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create windows-pool 32

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool application enable windows-pool rbd

# Create a 50GB RBD image
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd create windows-pool/windows-disk01 --size 51200

# Verify the image
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd info windows-pool/windows-disk01
```

## Mapping the RBD Image on Windows

Use the `rbd` command on the Windows client to map the image:

```powershell
# Map the RBD image as a Windows disk
rbd device map windows-pool/windows-disk01 --id windows-node1 `
  --keyring C:\ProgramData\ceph\ceph.client.windows-node1.keyring

# List mapped devices
rbd device list
```

## Initializing and Formatting the Disk

After mapping, the RBD image appears as an uninitialized disk in Windows:

```powershell
# List available disks
Get-Disk | Where-Object PartitionStyle -Eq 'RAW'

# Initialize the disk (replace DiskNumber with actual number)
Initialize-Disk -Number 1 -PartitionStyle GPT

# Create a partition
New-Partition -DiskNumber 1 -UseMaximumSize -AssignDriveLetter

# Format the partition as NTFS
Format-Volume -DriveLetter E -FileSystem NTFS -NewFileSystemLabel "CephRBD" -Confirm:$false
```

## Automatic Mounting on Boot

Create a startup script to automatically map the RBD image:

```powershell
# Create a startup script at C:\Scripts\mount-ceph-rbd.ps1
@"
# Mount Ceph RBD on startup
$rbdPath = "C:\Program Files\Ceph\bin\rbd.exe"
& $rbdPath device map windows-pool/windows-disk01 --id windows-node1
"@ | Set-Content "C:\Scripts\mount-ceph-rbd.ps1"

# Register as a scheduled task at system startup
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-File C:\Scripts\mount-ceph-rbd.ps1"
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -Action $action -Trigger $trigger `
  -TaskName "MountCephRBD" -RunLevel Highest
```

## Using RBD with Kubernetes on Windows

For Kubernetes workloads on Windows nodes, configure the CSI RBD driver to support Windows:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd-windows
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: windows-pool
  imageFormat: "2"
  imageFeatures: layering
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: kubernetes.io/os
    values:
    - windows
```

## Summary

Mounting Ceph RBD images on Windows involves creating the image on the cluster, mapping it using the Ceph Windows client tools, and then initializing and formatting it as a standard Windows disk. For persistent mounts across reboots, use scheduled tasks or service wrappers to re-map the image at startup. For Kubernetes Windows workloads, configure the CSI RBD driver with Windows-specific storage classes and node topology restrictions.
