# How to Set Up Ceph SMB Module for File Sharing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, SMB, File Sharing, CephFS

Description: Learn how to set up the Ceph SMB module to expose CephFS directories as SMB shares for Windows and Linux clients using the native Ceph orchestrator.

---

## What is the Ceph SMB Module?

The Ceph SMB module is a Ceph Manager module that automates deploying and managing Samba daemons on top of CephFS. Rather than manually configuring Samba on each node, the module handles daemon lifecycle, configuration generation, and integration with Active Directory.

## Prerequisites

- A healthy Ceph cluster with CephFS deployed
- Ceph Tentacle (v20) or later
- The `smb` manager module available

Enable the SMB module:

```bash
ceph mgr module enable smb
ceph mgr module ls | grep smb
```

## Creating a CephFS Share

First, ensure CephFS is deployed:

```bash
ceph fs ls
```

Create a subdirectory to share:

```bash
ceph fs subvolume create cephfs share1 --group_name smb-group
ceph fs subvolume getpath cephfs share1 --group_name smb-group
```

## Deploying an SMB Cluster via the Module

Create an SMB cluster configuration using the Ceph SMB module API:

```bash
ceph smb cluster create smb1 user \
  --placement="samba-node1"
```

For an Active Directory-joined SMB cluster:

```bash
ceph smb cluster create smb-ad active-directory \
  --domain-realm=EXAMPLE.COM \
  --domain-join-user-pass=administrator%ADPassword123 \
  --placement="samba-node1 samba-node2"
```

## Creating an SMB Share

After the cluster is running, create a share that maps to the CephFS subvolume:

```bash
ceph smb share create smb1 share1 cephfs /volumes/smb-group/share1
```

List configured shares:

```bash
ceph smb share ls smb1
```

## Verifying the Samba Daemon

Check that Samba is running via the orchestrator:

```bash
ceph orch ps | grep smb
```

Verify the share is advertised:

```bash
smbclient -L //samba-node1 -N
```

Expected output:

```text
Sharename       Type      Comment
---------       ----      -------
share1          Disk
IPC$            IPC       IPC Service
```

## Connecting from a Linux Client

Mount the share on a Linux client:

```bash
mount -t cifs //samba-node1/share1 /mnt/smb \
  -o username=cephuser,password=UserPass123,vers=3.1.1
```

Or add to `/etc/fstab` for persistence:

```text
//samba-node1/share1  /mnt/smb  cifs  username=cephuser,password=UserPass123,vers=3.1.1,_netdev  0  0
```

## Connecting from Windows

From PowerShell:

```powershell
New-PSDrive -Name Z -PSProvider FileSystem -Root "\\samba-node1\share1" -Persist
```

Or map the drive in File Explorer using `\\samba-node1\share1`.

## Summary

The Ceph SMB module simplifies deploying Samba on top of CephFS by handling daemon management through the Ceph orchestrator. Creating an SMB cluster and adding shares requires only a few CLI commands, and the resulting shares are accessible from any Windows or Linux client supporting the CIFS/SMB protocol.
