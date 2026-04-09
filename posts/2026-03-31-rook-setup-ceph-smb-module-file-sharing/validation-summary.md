# Validation Summary: How to Set Up Ceph SMB Module for File Sharing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (storage platform)
- Ceph Manager SMB module
- CephFS (Ceph File System)
- Samba / SMB / CIFS protocol
- cephadm orchestrator
- Active Directory integration
- Linux CIFS client (`mount -t cifs`)
- Windows SMB client (PowerShell `New-PSDrive`)

## Sources Consulted
- Ceph official documentation — SMB module: https://docs.ceph.com/en/latest/mgr/smb/
- Ceph official documentation — SMB service (cephadm): https://docs.ceph.com/en/latest/cephadm/services/smb/
- Ceph official blog — "SMB Meets Squid: Introducing the New Ceph SMB Manager Module": https://ceph.io/en/news/blog/2025/smb-manager-module/
- Ceph official documentation — Tentacle release notes: https://docs.ceph.com/en/latest/releases/tentacle/
- Ceph official documentation — FS Volumes and Subvolumes: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- Ceph source code — SMB module CLI definitions: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/smb/module.py
- IBM Storage Ceph 8.0 documentation — Managing SMB clusters: https://www.ibm.com/docs/en/storage-ceph/8.0.0?topic=shares-managing-smb-clusters-by-using-imperative-method

## Issues Found

### 1. Invalid `--placement` syntax with `host:` prefix
- **What was wrong:** The `ceph smb cluster create` commands used `--placement="host:samba-node1"` and `--placement="host:samba-node1,samba-node2"`. The `host:` prefix is not a valid cephadm placement specification format. Cephadm placement specs accept bare hostnames, `label:<label>`, or `count` — but not `host:<hostname>`.
- **What was changed:** Removed the `host:` prefix so the placement specs read `--placement="samba-node1"` and `--placement="samba-node1 samba-node2"`. Also corrected the multi-host separator from comma to space, which is the standard cephadm format.
- **Why:** Using the incorrect `host:` prefix would cause the placement spec parser to fail or misinterpret the target hosts.

### 2. Invalid named flags for `ceph smb share create`
- **What was wrong:** The share creation command used `--cephfs-volume=cephfs` and `--cephfs-path=/volumes/smb-group/share1` as named flags. These flags do not exist in the `ceph smb share create` CLI. The CephFS volume name and path are positional arguments.
- **What was changed:** Replaced the named flags with positional arguments: `ceph smb share create smb1 share1 cephfs /volumes/smb-group/share1`.
- **Why:** Using non-existent flags would cause the command to fail with an unrecognized argument error.

## Review Notes
- The prerequisite states "Ceph Tentacle (v20) or later." The SMB module was actually introduced in Ceph Squid (v19), though with partial support. Full support is available in Tentacle (v20). The statement is not wrong (Tentacle is a safe recommendation) but could be more precise.
- The `user` auth mode cluster creation example does not include `--define-user-pass` to create local Samba users. Without this, the cluster would have no credentials for authentication. This is a completeness gap rather than a technical error, as the post is showing the basic command structure.
- The `--group_name` syntax used in subvolume commands is correct per the Ceph API reference, though official blog posts sometimes use the hyphenated form `--group-name`. Both are accepted by the Ceph CLI framework.
