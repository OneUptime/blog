# How to Set Up the SMB Module in Ceph Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, SMB, Samba, File Sharing

Description: Learn how to configure the Ceph Manager SMB module to deploy and manage Samba gateways that expose CephFS directories as SMB/CIFS shares.

---

The Ceph Manager SMB module manages Samba-based gateways that expose CephFS directories as SMB (Server Message Block) shares. This enables Windows clients and other SMB-capable systems to access Ceph storage using native file sharing protocols without requiring CephFS client software.

## Prerequisites

- CephFS must be deployed and healthy
- Samba packages (`samba`, `ctdb`) must be available on gateway nodes
- The SMB module requires Ceph Tentacle (v20) or later (partial support exists in Squid v19)

## Enabling the SMB Module

```bash
ceph mgr module enable smb
```

Verify the module loaded:

```bash
ceph mgr module ls | grep smb
```

## Creating an SMB Cluster

Define a cluster grouping the Samba gateway daemons:

```bash
ceph smb cluster create smb1 active-directory \
  --domain-realm EXAMPLE.COM \
  --domain-join-user-pass admin%password
```

For workgroup (non-AD) setups:

```bash
ceph smb cluster create smb1 user
```

## Creating an SMB Share

Export a CephFS path as an SMB share:

```bash
ceph smb share create smb1 share1 cephfs /projects
```

List configured shares:

```bash
ceph smb share ls smb1
```

## Connecting from Windows

From a Windows client, map the network drive using File Explorer or the command line:

```cmd
net use Z: \\192.168.1.20\share1 /user:EXAMPLE\alice password123
```

## SMB in Kubernetes Environments

Rook does not natively support SMB - there is no `CephSMBCluster` CRD. The Ceph SMB manager module relies on `cephadm` orchestration, which Rook replaces with its own Kubernetes-native orchestration.

For Kubernetes environments, the community-recommended approach is the [samba-operator](https://github.com/samba-in-kubernetes/samba-operator) project, which provides CRDs such as `SmbShare` and can work alongside Rook-managed Ceph clusters:

```yaml
apiVersion: samba-operator.samba.org/v1alpha1
kind: SmbShare
metadata:
  name: smbshare1
spec:
  storage:
    pvc:
      name: "cephfs-pvc"
  readOnly: false
```

Apply and check status:

```bash
kubectl apply -f smbshare.yaml
kubectl get smbshare
```

## Checking Samba Logs

Review Samba service logs for connection issues:

```bash
# On the gateway node
journalctl -u smbd --since "1 hour ago"

# Or via Ceph
ceph log last 20 | grep smb
```

## Monitoring Active Connections

Check active SMB sessions on a gateway:

```bash
smbstatus --shares
```

```text
Service      pid     Machine       Connected at
share1       12345   192.168.1.50  Tue Mar 31 09:00:00 2026
```

## Summary

The Ceph Manager SMB module enables Samba-based SMB/CIFS gateways backed by CephFS, allowing Windows and Linux clients to access Ceph storage using standard file sharing protocols. Clusters and shares are managed through `ceph smb` commands, with support for both Active Directory and workgroup authentication modes. For Kubernetes environments, the samba-operator project can provide SMB access alongside Rook-managed Ceph clusters.
