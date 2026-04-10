# Validation Summary: How to Configure Ceph Encryption for Compliance Requirements

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- LUKS (Linux Unified Key Setup) for disk encryption
- HashiCorp Vault (external KMS)
- Ceph Messenger v2 (in-transit encryption)
- Ceph RGW (RADOS Gateway) with TLS
- FIPS 140-2 compliance tooling
- Kubernetes

## Sources Consulted
- Rook CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Key Management System documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- Rook CephObjectStore CRD documentation — https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph Messenger v2 documentation — https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph RGW encryption documentation — https://docs.ceph.com/en/latest/radosgw/encryption/
- Ceph source code (`src/common/options/global.yaml.in` and `src/common/options/rgw.yaml.in`) for config option verification
- Red Hat FIPS documentation for `fips-mode-setup` command

## Issues Found

1. **`ceph health detail | grep -i encrypt` does not show encryption status (Verifying Encryption Status section):** The `ceph health detail` command reports cluster health warnings and errors (OSD failures, PG degradation, monitor issues, etc.), not encryption configuration. It will not return results about whether OSDs are encrypted. Replaced with `ls /dev/mapper/ | grep ceph` to check for dmcrypt devices and `ceph osd metadata 0 | grep -i dmcrypt` to check OSD encryption metadata.

2. **`rgw_crypt_s3_kms_encryption_keys ""` removed (RGW TLS Configuration section):** This config option is a developer/testing-only option in Ceph, not a production configuration knob. It was also contextually misplaced — the surrounding text discusses TLS certificate requirements and cipher suites, but this option relates to inline S3 KMS encryption keys, not TLS configuration. Removed the command as it is inappropriate for a compliance-focused guide.

## Review Notes
- The `fips-mode-setup --enable` command is RHEL/CentOS/Fedora-specific and is not available on Debian/Ubuntu or other distributions. The post does not note this platform limitation. It also requires a reboot to take effect, which is not mentioned.
- The Messenger v2 settings (`ms_cluster_mode`, `ms_service_mode`, `ms_client_mode`) default to `crc secure`, meaning both modes are allowed with CRC preferred. Setting to just `secure` enforces encryption-only, which is correct for compliance but will break connectivity with any v1-only clients.
- The Vault KMS example uses token-based authentication. For production compliance environments, Kubernetes auth (`VAULT_AUTH_METHOD: kubernetes`) is generally preferred over static tokens.
