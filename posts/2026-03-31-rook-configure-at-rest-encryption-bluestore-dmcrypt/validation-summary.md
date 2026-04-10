# Validation Summary: How to Configure At-Rest Encryption with BlueStore and dmcrypt

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph BlueStore (OSD storage backend)
- dmcrypt / LUKS (Linux kernel device-mapper encryption)
- HashiCorp Vault (KMS integration)
- Kubernetes (CRDs, Secrets, kubectl)

## Sources Consulted
- [CephCluster CRD - Rook Ceph Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/) — verified `encryptedDevice: "true"` field path and behavior
- [Rook CRD Specification](https://rook.io/docs/rook/latest/CRDs/specification/) — confirmed the YAML field is `kms`, not `keyManagementService`
- [Key Management System - Rook Ceph Documentation](https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/) — verified Vault KMS YAML structure, field names, and `VAULT_CACERT` semantics
- [Rook cluster.yaml example (GitHub master)](https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml) — confirmed `encryptedDevice` placement in `spec.storage.config`
- [GitHub Discussion #14145 - Where is the default encryption key](https://github.com/rook/rook/discussions/14145) — confirmed encryption keys for `encryptedDevice` OSDs are stored in the Ceph mon store, not Kubernetes secrets
- [Rook KMS documentation on GitHub](https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Advanced/key-management-system.md) — verified Vault connection detail field names and auth methods

## Issues Found

1. **KMS YAML field name was wrong**: The post used `keyManagementService` but the correct CRD field is `kms`. Changed `spec.security.keyManagementService` to `spec.security.kms`.

2. **Bogus `enable: true` field**: The KMS YAML included `enable: true`, which does not exist in the `KeyManagementServiceSpec` CRD. KMS is implicitly enabled when `connectionDetails` are provided. Removed the field.

3. **Missing required Vault connection fields**: The Vault configuration was missing `VAULT_SECRET_ENGINE` and `VAULT_AUTH_METHOD`, which appear in all official examples. Added `VAULT_SECRET_ENGINE: "kv"` and `VAULT_AUTH_METHOD: "token"`.

4. **`VAULT_CACERT` value was a file path instead of a secret name**: The post used `"/etc/ceph/vault.ca"` but in the Rook CRD, `VAULT_CACERT` expects the name of a Kubernetes Secret containing the PEM-encoded CA certificate. Changed to `"vault-ca-cert"`.

5. **`VAULT_BACKEND_PATH` used non-standard value**: The post used `"rook/osd"` but all official examples use `"rook"`. Changed to match the documented standard.

6. **Incorrect default key storage location**: The post claimed "Rook stores encryption keys in a Kubernetes Secret" by default. For `encryptedDevice: "true"` (host-based encryption), keys are actually stored in the Ceph mon store, as confirmed by Rook maintainer travisn in GitHub Discussion #14145. Corrected to "Ceph mon store".

7. **Encryption key inspection commands were wrong**: The post showed `kubectl get secret` commands to inspect keys, but since keys are in the Ceph mon store (not Kubernetes secrets), the correct method is `ceph config-key get dm-crypt/osd/<osd-uuid>/luks` from the Rook toolbox. Replaced the commands accordingly.

8. **Key flow description referenced wrong storage**: Step 2 of the key flow said "stored in a Kubernetes Secret (or KMS)". Corrected to "stored in the Ceph mon store (or a KMS if configured)".

9. **Summary referenced wrong verification method**: The summary mentioned "reviewing Kubernetes secrets holding OSD keys". Corrected to "inspecting keys in the Ceph mon store".

## Review Notes
- The `encryptedDevice: "true"` configuration is the host-based encryption approach. Rook also supports PVC-based encryption via `encrypted: true` on `storageClassDeviceSets`, where keys ARE stored in Kubernetes secrets by default. The blog correctly focuses on one approach but readers should be aware of both.
- The claim "encryption cannot be added to existing OSDs" is accurate for host-based `encryptedDevice` OSDs, though PVC-based OSDs can be migrated to enable encryption via OSD management.
- The AES-NI overhead claim of "less than 5%" is a reasonable general estimate for modern hardware, though actual overhead depends on workload characteristics and hardware specifics.
- The Rook Vault integration also supports Kubernetes Service Account authentication (`VAULT_AUTH_METHOD: "kubernetes"`), which is generally recommended over token-based auth for production use, as it handles automatic token renewal.
