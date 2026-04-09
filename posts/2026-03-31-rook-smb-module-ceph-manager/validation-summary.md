# Validation Summary: How to Set Up the SMB Module in Ceph Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage platform)
- Ceph Manager SMB module
- Samba / SMB / CIFS file sharing
- Rook (Kubernetes operator for Ceph)
- samba-operator (Kubernetes operator for Samba)
- CephFS (Ceph distributed filesystem)
- Windows SMB client (`net use`)

## Sources Consulted
- Ceph SMB module official documentation (`doc/mgr/smb.rst` in the Ceph repository)
- Ceph SMB module source code (`src/pybind/mgr/smb/cli.py`, `src/pybind/mgr/smb/module.py`)
- Ceph MonCommands source (`src/mon/MonCommands.h`) for `ceph log last` verification
- Rook GitHub repository (`rook/rook`) — CRD definitions in `deploy/examples/crds.yaml` and `pkg/apis/ceph.rook.io/v1/types.go`
- Rook GitHub Issues #14505 (SMB module support request) and #5537 (Samba support)
- samba-operator GitHub repository (`samba-in-kubernetes/samba-operator`)
- Ceph release branches (reef, squid, tentacle) to verify SMB module availability per version

## Issues Found

### 1. Wrong Ceph version requirement (line 17)
- **What was wrong:** The post stated "The SMB module requires Ceph Reef (v18) or later." The `mgr/smb` module directory does not exist on the `reef` (v18) or `squid` (v19) branches. It was fully introduced in Ceph Tentacle (v20), with only partial/preliminary orchestrator-level support in Squid (v19).
- **What was changed:** Updated to "Ceph Tentacle (v20) or later (partial support exists in Squid v19)."

### 2. Incorrect `ceph smb cluster create` syntax (lines 36-39, 45)
- **What was wrong:** The post used `--auth-mode active-directory` and `--auth-mode user` as named flags. In the actual CLI, the auth mode (`active-directory` or `user`) is a **positional argument**, not a `--auth-mode` flag. Additionally, the domain join credential separator was shown as `:` (`admin:password`) but the actual separator is `%` (`admin%password`), as confirmed by the source code which splits on `%`.
- **What was changed:** Changed to positional syntax: `ceph smb cluster create smb1 active-directory ...` and `ceph smb cluster create smb1 user`. Changed password separator from `:` to `%`.

### 3. Incorrect `ceph smb share create` syntax (lines 54-55)
- **What was wrong:** The post used `--cephfs-volume cephfs --cephfs-path /projects` as named flags. In the actual CLI, `cephfs_volume` and `path` are **positional arguments**.
- **What was changed:** Changed to positional syntax: `ceph smb share create smb1 share1 cephfs /projects`.

### 4. Fabricated Rook `CephSMBCluster` CRD (entire "Rook SMB Configuration" section)
- **What was wrong:** The post presented a `CephSMBCluster` custom resource with `apiVersion: ceph.rook.io/v1`. This CRD does not exist in Rook and has never existed. Rook has no SMB support at all — confirmed by searching the Rook repository and GitHub issues (#14505, #5537). A Ceph/Samba developer explicitly noted that the Ceph SMB module requires `cephadm` orchestration, which Rook replaces.
- **What was changed:** Replaced the section with accurate information: Rook does not support SMB natively. Pointed to the `samba-operator` project as the community-recommended approach for Kubernetes environments, with a correct `SmbShare` resource example.

### 5. Summary section referenced non-existent Rook CRD
- **What was wrong:** The summary mentioned "Rook `CephSMBCluster` custom resources" as a management method.
- **What was changed:** Removed the incorrect Rook CRD reference and replaced with a mention of the samba-operator project.

## Review Notes
- The `ceph log last 20` command is valid (confirmed in `src/mon/MonCommands.h`), though it only shows cluster-level log entries and may not capture detailed Samba daemon logs. The `journalctl -u smbd` approach is more reliable for Samba-specific troubleshooting.
- The `smbstatus --shares` command and `ceph smb share ls` command are both correct.
- The prerequisite about Samba packages (`samba`, `ctdb`) being available on gateway nodes is accurate for manual deployments but slightly misleading for `cephadm`-based deployments where Samba runs in containers. The `ctdb` package is only needed for clustered/HA Samba setups.
- The `net use` Windows command syntax shown is correct.
- The samba-operator project is noted as "minimally maintained" per its README, which is worth keeping in mind for future updates to this post.
