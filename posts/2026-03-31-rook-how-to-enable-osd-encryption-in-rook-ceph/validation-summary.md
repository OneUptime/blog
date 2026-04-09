# Validation Summary: How to Enable OSD Encryption in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph OSD (Object Storage Daemon)
- Linux LUKS (Linux Unified Key Setup) disk encryption
- HashiCorp Vault (KMS integration)
- Kubernetes Secrets
- dm-crypt / cryptsetup

## Sources Consulted
- Rook official documentation: Storage Configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook CephCluster CRD source code (`types.go` in rook/rook GitHub repository)
- Rook KMS configuration documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/)
- Ceph documentation on OSD encryption and ceph-volume LUKS support
- HashiCorp Vault Kubernetes auth method documentation

## Issues Found

### 1. Host-based OSD encryption used wrong field name and structure
- **What was wrong:** The blog used `encrypted: true` (boolean) directly on the node object under `spec.storage.nodes[]`. The correct field is `encryptedDevice: "true"` (a string) nested inside a `config` map at `spec.storage.nodes[].config.encryptedDevice`.
- **What was changed:** Updated the YAML snippet to use `config.encryptedDevice: "true"` with the correct nesting and string type.
- **Why:** The `encrypted` boolean field only exists on `storageClassDeviceSets` entries (PVC-based OSDs). Host-based OSDs use the `encryptedDevice` string field inside the `config` map. Using the wrong field would silently fail to enable encryption.

### 2. Encryption key secret naming pattern was incorrect
- **What was wrong:** The blog showed the secret naming pattern as `rook-ceph-osd-encryption-key-<osd-id>`, suggesting the numeric OSD ID is used.
- **What was changed:** Corrected to `rook-ceph-osd-encryption-key-<pvc-name>`, since PVC-based encrypted OSD secrets are keyed by the PVC name, not the OSD numeric ID.
- **Why:** Using the wrong identifier pattern would confuse users trying to locate or manage encryption key secrets.

### 3. Removed undocumented VAULT_AUTH_KUBERNETES_HOST field
- **What was wrong:** The Vault Kubernetes auth example included `VAULT_AUTH_KUBERNETES_HOST: https://kubernetes.default.svc` as a Rook `connectionDetails` field. This field is not part of the official Rook KMS connection details specification. The Kubernetes API host is configured on the Vault server side when setting up the Kubernetes auth method, not in the Rook CRD.
- **What was changed:** Removed the `VAULT_AUTH_KUBERNETES_HOST` line from the Vault Kubernetes auth example.
- **Why:** Including an undocumented field could cause confusion or unexpected behavior.

## Review Notes
- The LUKS version shown in the verification output (LUKS2) is plausible for PVC-based OSDs with modern Rook images (which use newer cryptsetup that defaults to LUKS2), though ceph-volume for host-based OSDs defaults to LUKS1. Since the example output specifically shows a PVC-based device name (`set1-data-0`), LUKS2 is reasonable.
- Performance figures (20-30% without AES-NI, 5-10% with) are commonly cited rough estimates but real-world impact can vary significantly depending on storage medium (HDD vs NVMe), workload pattern, and CPU generation. Some benchmarks show higher overhead, especially for sequential workloads on fast NVMe storage.
- The `VAULT_BACKEND_PATH: secret/rook` value assumes a Vault KV engine mounted at `secret/rook`. The more common default Vault setup has KV mounted at `secret`. Users should adjust this to match their Vault configuration.
- Recent Rook versions support OSD migration (via `migration.confirmation` field) which can automate the process of moving from unencrypted to encrypted OSDs by destroying and recreating them one at a time. The blog's limitation about encryption only at creation time is functionally accurate but Rook now provides tooling to facilitate migration.
