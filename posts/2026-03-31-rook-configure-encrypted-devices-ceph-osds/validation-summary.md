# Validation Summary: How to Configure Encrypted Devices for Ceph OSDs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph OSDs (Object Storage Daemons)
- dm-crypt / LUKS (Linux disk encryption)
- Kubernetes (secrets, kubectl debug, CRDs)
- HashiCorp Vault (KMS integration)

## Sources Consulted
- Rook official documentation — OSD configuration: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-osd-config/
- Rook official documentation — Key Management System: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/key-management-system/
- Rook official documentation — CephCluster CRD: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook source code (pkg/operator/ceph/cluster/osd/spec.go, pkg/daemon/ceph/osd/kms/k8s.go) for device mapper naming and secret naming patterns

## Issues Found

### 1. Incorrect device mapper name pattern (Step 4)
- **What was wrong:** The command used `/dev/mapper/ocs-devicemapper-*` which is an OpenShift Container Storage (OCS)-specific naming pattern, not applicable to generic Rook deployments. The `kubectl debug` command was also missing required `-it` and `--image` flags, and had an unnecessary `-n rook-ceph` namespace flag.
- **What was changed:** Updated to `kubectl debug node/worker-1 -it --image=busybox -- chroot /host cryptsetup status /dev/mapper/*-block-dmcrypt` which uses the correct Rook device mapper naming pattern (`<name>-block-dmcrypt`) and includes the required flags for `kubectl debug node/`.
- **Why:** Rook creates dm-crypt device mapper entries with the suffix `-block-dmcrypt` (e.g., `set1-data-0-block-dmcrypt`). The `ocs-devicemapper-*` pattern would not match any devices in a standard Rook deployment.

### 2. Wrong command for checking encryption status across all OSDs (Step 5)
- **What was wrong:** The command used `ceph osd dump | grep encrypt`. The `ceph osd dump` command outputs the OSD map (states, weights, addresses, pool info) and does not contain encryption metadata.
- **What was changed:** Replaced `ceph osd dump` with `ceph osd metadata` which outputs per-OSD metadata including encryption-related fields.
- **Why:** Encryption information is stored in OSD metadata (accessible via `ceph osd metadata`), not in the OSD map dump. The original command would return no results even when encryption is properly configured.

## Review Notes
- The `encryptedDevice: "true"` string-in-config-map approach is correct for raw device OSDs (as shown in the post with `useAllDevices: true`). PVC-based OSDs use a different field (`encrypted: true` at the `storageClassDeviceSets` level), but this is outside the scope of the post.
- The Vault KMS configuration omits `VAULT_AUTH_METHOD` from `connectionDetails`, which defaults to token-based auth. This is acceptable since the post uses `tokenSecretName`, but production users should be aware of Kubernetes-based auth as an alternative.
- The encryption key secret naming pattern shown (`rook-ceph-osd-encryption-key-0`) may vary depending on whether raw devices or PVCs are used. For PVC-based OSDs, the pattern uses the PVC name rather than an OSD ID.
- The 2-5% performance overhead claim is reasonable for dm-crypt/LUKS with AES-NI hardware acceleration on modern server CPUs.
