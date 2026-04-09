# How to Install Ceph on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Window, WNBD, Storage, Installation

Description: Learn how to install and configure Ceph client components on Windows, enabling RBD block devices and RADOS access from Windows servers.

---

## Ceph on Windows Overview

Starting with Ceph Pacific, official Windows client support was introduced. Windows support covers:
- **RBD (WNBD driver)**: Map Ceph block devices as Windows disks via the Windows Network Block Device driver
- **librados**: Native Windows binaries for RADOS object access
- **CephFS**: Access CephFS shares via NFS (through a Linux NFS gateway) or Dokan-based client

This enables Windows workloads to consume Ceph storage without intermediate Linux proxies.

## Prerequisites

- Windows Server 2019 or Windows Server 2022 (Windows 10/11 also supported)
- Access to an existing Ceph cluster (Pacific+)
- Administrator privileges on the Windows machine
- Network access to Ceph monitors (port 6789 or 3300)

## Installing the WNBD Driver and RBD Client

Download the official Ceph Windows MSI installer from Cloudbase Solutions (https://cloudbase.it/ceph-for-windows/):

```powershell
# Download the Ceph Windows installer (adjust release as needed: ceph_reef, ceph_quincy, etc.)
Invoke-WebRequest -Uri "https://cloudbase.it/downloads/ceph_quincy.msi" `
  -OutFile "C:\Temp\ceph_quincy.msi"

# Install silently
msiexec /i "C:\Temp\ceph_quincy.msi" /qn /l*v "C:\Temp\ceph-install.log"
```

The installer deploys:
- `C:\Program Files\Ceph\bin\rbd.exe`
- `C:\Program Files\Ceph\bin\rados.exe`
- WNBD kernel driver (for RBD block devices)
- Ceph Windows service

## Configuring ceph.conf

Create the Ceph configuration file at `C:\ProgramData\ceph\ceph.conf`:

```ini
[global]
fsid = a1b2c3d4-e5f6-7890-abcd-ef1234567890
mon_host = 192.168.1.10,192.168.1.11,192.168.1.12
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
log_file = C:\ProgramData\ceph\logs\ceph.log
```

Copy the admin keyring to `C:\ProgramData\ceph\ceph.client.admin.keyring`:

```ini
[client.admin]
    key = AQCv6KFbhDfVBhAAc3X+EMTuvQ4SDPXZIV3l7g==
```

## Verifying Connectivity

```powershell
# Test connectivity to Ceph
& "C:\Program Files\Ceph\bin\ceph.exe" status

# List pools
& "C:\Program Files\Ceph\bin\rados.exe" lspools
```

## Mapping an RBD Image as a Windows Disk

Create an RBD image on the Ceph cluster (from a Linux management host):

```bash
rbd create --size 10240 replicapool/windows-disk
```

Map it on Windows:

```powershell
# Map the RBD image as a block device
& "C:\Program Files\Ceph\bin\rbd.exe" map replicapool/windows-disk

# List mapped devices
& "C:\Program Files\Ceph\bin\rbd.exe" device list
```

The RBD image appears as a new disk in Disk Management. Format and assign a drive letter:

```powershell
# Initialize and format via diskpart
diskpart
list disk
select disk 1
online disk
attributes disk clear readonly
convert gpt
create partition primary
format fs=ntfs quick
assign letter=E
exit
```

## Unmapping and Cleanup

```powershell
# Unmap the device by image spec
& "C:\Program Files\Ceph\bin\rbd.exe" device unmap replicapool/windows-disk
```

## RADOS Access from Windows

```powershell
# Write an object
echo "hello" | & "C:\Program Files\Ceph\bin\rados.exe" -p mypool put testobj -

# Read the object
& "C:\Program Files\Ceph\bin\rados.exe" -p mypool get testobj -
```

## Summary

Ceph Windows support through the WNBD driver and official MSI installer enables Windows workloads to consume RBD block devices and RADOS object storage directly. The setup involves installing the Ceph Windows package, configuring `ceph.conf` with monitor addresses and keyring credentials, and then using `rbd.exe` to map images as local disks. This integration eliminates the need for NFS or iSCSI gateways when connecting Windows servers to Ceph storage clusters.
