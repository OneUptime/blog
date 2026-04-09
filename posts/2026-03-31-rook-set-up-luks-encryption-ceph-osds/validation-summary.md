# Validation Summary: How to Set Up LUKS Encryption for Ceph OSDs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (BlueStore OSDs)
- LUKS / LUKS2 (Linux Unified Key Setup)
- dm-crypt / cryptsetup
- Kubernetes Secrets (for PVC-based OSD key management)
- HashiCorp Vault (mentioned for production key management)

## Sources Consulted
- Rook CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook source code (kms/k8s.go) — https://github.com/rook/rook/blob/master/pkg/daemon/ceph/osd/kms/k8s.go
- Rook v1.4.0 release notes — https://github.com/rook/rook/releases/tag/v1.4.0
- Rook example cluster.yaml — https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml
- cryptsetup-luksDump(8) man page — https://man7.org/linux/man-pages/man8/cryptsetup-luksDump.8.html
- Ceph BlueStore configuration reference — https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- ceph-bluestore-tool man page — https://docs.ceph.com/en/reef/man/8/ceph-bluestore-tool/

## Issues Found

1. **Incorrect Rook version for encryption support**: Post claimed "Rook 1.5+" but OSD encryption was introduced in Rook v1.4.0. Changed to "Rook 1.4+".

2. **`cryptsetup luksDump` output format was LUKS1-style, not LUKS2**: The expected output showed top-level fields like `Cipher`, `Cipher key`, and `Hash spec` which are LUKS1 field names. LUKS2 output is structured with `Data segments` and `Keyslots` sections. Updated to show accurate LUKS2 output format.

3. **Key management section described PVC-based secrets but config showed host-based OSDs**: The post configured host-based raw device OSDs (`spec.storage.nodes`) but then described Kubernetes Secrets that only exist for PVC-based OSDs. For host-based OSDs, encryption keys are stored in the Ceph mon key-value store and retrieved via `ceph config-key get dm-crypt/osd/<osd-uuid>/luks`. Updated the section to show both host-based and PVC-based key management.

4. **Secret label selector used wrong format**: Changed `pvc-name` (hyphen) to `pvc_name` (underscore) to match the actual label key used in Rook source code.

5. **Secret naming convention was incorrect**: Changed `rook-ceph-osd-encryption-key-<osd-id>` to `rook-ceph-osd-encryption-key-<pvc-name>` since the secret name is based on the PVC claim name, not the OSD ID.

6. **Recovery section used `mount` on a BlueStore device**: BlueStore OSDs write directly to raw block devices without a filesystem. The `mount` command would fail. Replaced with `ceph-bluestore-tool show-label` which is the correct tool for inspecting BlueStore devices.

7. **Recovery section retrieved key from wrong source**: The recovery command used `kubectl get secret` which only works for PVC-based OSDs. Updated to use `ceph config-key get` consistent with the host-based configuration shown in the post.

8. **LUKS2 default version claim was inaccurate**: Post claimed "Rook 1.9+" for LUKS2 default. The LUKS format version actually depends on the cryptsetup version in the Ceph container image (cryptsetup 2.1+ defaults to LUKS2), not a specific Rook version. Updated accordingly.

9. **Minor: header size unit**: Changed "16MB" to "16 MiB" for accuracy (LUKS2 uses binary units).

## Review Notes
- The `encryptedDevice: "true"` field under `spec.storage.config` is correct for host-based (raw device) OSD configurations. For PVC-based OSDs, the equivalent is `encrypted: true` under `storageClassDeviceSets`.
- The post could benefit from explicitly noting whether it targets host-based or PVC-based OSD setups, as the key management differs significantly between the two approaches.
- The Vault integration for key rotation mentioned in the "Rotating LUKS Keys" section is accurate but brief. Users may need to consult Rook's KMS documentation for setup details.
