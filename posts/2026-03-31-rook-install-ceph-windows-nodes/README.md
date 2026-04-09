# How to Install Ceph on Windows Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Window, Kubernetes, Storage, Installation

Description: Learn how to install and configure Ceph client components on Windows nodes in a Kubernetes cluster to enable Windows workloads to access Ceph storage.

---

## Ceph Windows Support Overview

Ceph provides native Windows client support, porting the RADOS, RBD, and CephFS client libraries to Windows. This enables Windows nodes in a Kubernetes cluster to use Ceph-backed persistent volumes, avoiding the need for additional layers such as iSCSI gateways or SMB shares.

Key components for Windows:
- `rbd-wnbd.exe` - RBD block device mapping via WNBD (Windows Network Block Device) driver
- `ceph-dokan` - CephFS mount via Dokany filesystem driver

## Prerequisites

Ensure your environment meets these requirements:

```powershell
# Required Windows versions
# Windows Server 2019 or 2022 (build 17763+)
# Windows 10/11 version 1809+

# Check Windows version
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsHardwareAbstractionLayer

# Ensure Hyper-V is available (for WSL2 / container support)
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V
```

## Installing the Ceph Windows Client

Download and install the Ceph Windows package:

```powershell
# Download the Ceph Windows installer from Cloudbase Solutions
# Check https://cloudbase.it/ceph-for-windows/ for the latest version
Invoke-WebRequest -Uri "https://cloudbase.it/downloads/ceph_reef.msi" `
  -OutFile "ceph-windows.msi"

# Install silently
msiexec.exe /i ceph-windows.msi /quiet /norestart

# Verify installation
Get-Command ceph -ErrorAction SilentlyContinue
```

## Configuring Ceph Client on Windows

Create the Ceph configuration directory and files:

```powershell
# Create Ceph config directory
New-Item -ItemType Directory -Force -Path "C:\ProgramData\ceph"

# Create ceph.conf
@"
[global]
fsid = <your-fsid>
mon_host = <mon1-ip>,<mon2-ip>,<mon3-ip>
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
"@ | Set-Content "C:\ProgramData\ceph\ceph.conf"
```

Get the cluster FSID and MON hosts:

```bash
# Run on Linux management node
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon dump | grep -E "fsid|quorum"
```

## Installing the Ceph Keyring

Create the client keyring on the Windows node:

```powershell
# Create keyring file
@"
[client.windows-node1]
key = AQBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==
"@ | Set-Content "C:\ProgramData\ceph\ceph.client.windows-node1.keyring"
```

Create the client key from your Linux management node:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.windows-node1 \
  mon 'profile rbd' \
  osd 'profile rbd pool=windows-pool' \
  mgr 'profile rbd pool=windows-pool'
```

## Testing Connectivity

Verify the Windows node can reach the Ceph cluster:

```powershell
# Test connectivity to MON
ceph -c C:\ProgramData\ceph\ceph.conf status

# List available pools
ceph -c C:\ProgramData\ceph\ceph.conf osd pool ls
```

## Installing the Dokany Driver

For CephFS filesystem mounting, install the Dokany userspace filesystem driver (version 2.0.5 or later). Dokany is not included in the Ceph MSI installer and must be installed separately:

```powershell
# Download and install Dokany from https://github.com/dokan-dev/dokany/releases
winget install Dokany.DokanLibrary

# Verify Dokan service is running
Get-Service -Name "dokan*"
```

## Summary

Installing Ceph on Windows nodes involves installing the Ceph Windows client package, creating the ceph.conf with cluster connection details, and setting up an authentication keyring scoped to specific pools. For RBD access, the base package is sufficient. For CephFS mounting, the Dokany driver is additionally required. With these components in place, Windows workloads can access Ceph block and file storage as persistent volumes in your Kubernetes cluster.
