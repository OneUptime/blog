# How to Mount CephFS on Windows Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Window, File System, Kubernetes

Description: Learn how to mount CephFS filesystems on Windows clients using the Dokan FUSE driver, enabling Windows workloads to access shared Ceph file storage.

---

## CephFS on Windows

CephFS can be mounted on Windows using the Ceph Dokan driver, which implements a FUSE-compatible filesystem interface using the Dokan library. This allows Windows applications to access a shared CephFS filesystem the same way they access any other network or local drive.

## Prerequisites

Install the required components on the Windows client:

```powershell
# Install Dokany (user-mode filesystem driver required by ceph-dokan)
# Minimum version: Dokany 2.0.5
# Download from https://github.com/dokan-dev/dokany/releases
winget install dokan-dev.Dokany

# Verify Dokany is installed
dokanctl /v

# Install Ceph Windows package (includes ceph-dokan)
# Download from https://download.ceph.com/windows/
msiexec.exe /i ceph-windows.msi /quiet
```

## Setting Up the CephFS Client Key

Create a client key scoped to read the CephFS filesystem:

```bash
# On Linux management node
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.windows-cephfs \
  mon 'allow r' \
  mds 'allow rw' \
  osd 'allow rw pool=myfs-data0,allow rw pool=myfs-metadata'
```

Store the key on the Windows client:

```powershell
# Create keyring file
New-Item -ItemType Directory -Force "C:\ProgramData\ceph"
@"
[client.windows-cephfs]
key = AQBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==
"@ | Set-Content "C:\ProgramData\ceph\ceph.client.windows-cephfs.keyring"
```

## Mounting CephFS with ceph-dokan

```powershell
# Mount CephFS to drive letter Z:
ceph-dokan -c C:\ProgramData\ceph\ceph.conf `
  --id windows-cephfs `
  --keyring C:\ProgramData\ceph\ceph.client.windows-cephfs.keyring `
  -l Z:

# Mount a specific subdirectory
ceph-dokan -c C:\ProgramData\ceph\ceph.conf `
  --id windows-cephfs `
  --root-path /shared `
  -l Z:
```

After running this command, drive Z: appears in Windows Explorer.

## Mounting as a Background Service

Run ceph-dokan as a Windows service for persistent mounting:

```powershell
# Create a service using NSSM (Non-Sucking Service Manager)
# Install NSSM first
winget install NSSM.NSSM

nssm install CephFS "C:\Program Files\Ceph\bin\ceph-dokan.exe"
nssm set CephFS AppParameters "-c C:\ProgramData\ceph\ceph.conf --id windows-cephfs -l Z:"
nssm set CephFS Start SERVICE_AUTO_START
nssm start CephFS
```

## Accessing CephFS from Applications

Once mounted, Windows applications can use the drive as any normal filesystem:

```powershell
# Test basic operations
New-Item -Path "Z:\test.txt" -ItemType File
Set-Content -Path "Z:\test.txt" -Value "Hello from Windows CephFS!"
Get-Content "Z:\test.txt"

# Create directories
New-Item -ItemType Directory "Z:\myapp-data"

# Check disk usage
Get-PSDrive Z
```

## Performance Tuning

Adjust ceph-dokan options for better performance:

```powershell
# Adjust operation timeout (in seconds) and enable debug logging
ceph-dokan -c C:\ProgramData\ceph\ceph.conf `
  --id windows-cephfs `
  -l Z: `
  --operation-timeout 60 `
  --debug

# For client-side caching tuning, add settings to ceph.conf:
# [client]
#   client cache size = 1073741824
#   client cache mid = 0.75
```

## Unmounting CephFS

```powershell
# Unmount the drive
# Press Ctrl+C in the ceph-dokan window, or:
nssm stop CephFS

# Force unmount using dokanctl
dokanctl /u Z:
```

## Summary

CephFS on Windows uses the ceph-dokan driver built on Dokany to expose a CephFS mount as a Windows drive letter. After installing WinFSP and the Ceph Windows package, configure a client keyring with appropriate permissions, run ceph-dokan to mount the filesystem, and optionally wrap it in a Windows service for persistent mounting. Windows applications interact with the mounted drive using standard file system APIs without any modifications.
