# How to Mount CephFS on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Window, Mount

Description: Learn how to mount a CephFS filesystem on Windows using the Ceph Windows client to access Rook-Ceph shared storage from Windows hosts.

---

## Overview

Ceph provides a native Windows client that allows Windows machines to mount CephFS filesystems. The Ceph Windows client (ceph-dokan) uses the Dokan userspace filesystem driver to present CephFS as a native Windows drive letter. This enables Windows workloads to access the same shared storage as Linux clients in a Rook-Ceph cluster.

## Prerequisites

- Windows 10/11 or Windows Server 2019/2022
- Dokany library installed (version 2.0.5 or later)
- Ceph Windows client binaries
- Network access to Ceph monitor addresses
- A valid CephX keyring

## Install Dokany

Download and install Dokany, the Windows userspace filesystem driver required by ceph-dokan:

```text
https://github.com/dokan-dev/dokany/releases
```

Run the installer and accept defaults. Dokany provides the kernel driver component that allows ceph-dokan to present CephFS as a native Windows filesystem.

## Download the Ceph Windows Client

Download the prebuilt Ceph Windows client package from the official Ceph downloads:

```text
https://download.ceph.com/windows/
```

Extract the archive to `C:\ceph` or a path of your choice.

## Configure Ceph Credentials

Create the configuration directory and files:

```text
C:\ProgramData\ceph\ceph.conf
C:\ProgramData\ceph\ceph.client.admin.keyring
```

Create `ceph.conf`:

```text
[global]
log_to_stderr = false
err_to_stderr = true
log_flush_on_exit = true

mon host = 192.168.1.10:6789 192.168.1.11:6789 192.168.1.12:6789
auth cluster required = cephx
auth service required = cephx
auth client required = cephx
```

Create `ceph.client.admin.keyring`:

```text
[client.admin]
    key = AQC...base64key...==
```

## Mount the Filesystem

Open a command prompt or PowerShell as Administrator:

```text
ceph-dokan.exe -c C:\ProgramData\ceph\ceph.conf -l x
```

This mounts the default CephFS filesystem as drive `X:`. The `-l` flag specifies the drive letter.

## Mount a Specific Filesystem or Subdirectory

```text
ceph-dokan.exe -c C:\ProgramData\ceph\ceph.conf -l x --client_fs cephfs --root-path /myapp
```

## Verify the Mount

Open File Explorer and navigate to the `X:` drive. You should see the CephFS directory structure.

From PowerShell:

```text
Get-PSDrive X
dir X:\
```

## Unmount

To unmount, press Ctrl+C in the ceph-dokan terminal window, or use the ceph-dokan unmap command:

```text
ceph-dokan.exe unmap -l x
```

## Configure as a Windows Service

For persistent mounting, register `ceph-dokan` as a Windows service using NSSM or the Service Control Manager so the mount survives reboots.

## Troubleshooting

Enable debug logging to diagnose connection issues:

```text
ceph-dokan.exe -c C:\ProgramData\ceph\ceph.conf -l x --debug --dokan-stderr
```

Check Windows Event Viewer for Dokany driver errors under `Applications and Services Logs > Dokan`.

## Summary

Mounting CephFS on Windows using `ceph-dokan` and the Dokany driver allows Windows clients to access Rook-Ceph shared storage natively as a mapped drive. This extends the reach of your CephFS deployment to mixed Windows and Linux environments, enabling cross-platform file sharing with a consistent storage backend.
