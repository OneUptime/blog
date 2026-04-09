# Validation Summary: How to Disable CephX for Testing (and Why You Shouldn't in Production)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- CephX (Ceph authentication protocol)
- Kubernetes (kubectl CLI)

## Sources Consulted
- [CephCluster CRD - Rook Ceph Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/) - Verified `spec.cephConfig` field structure and quoting requirements
- [Ceph Configuration - Rook Ceph Documentation](https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/) - Verified config override mechanisms
- [CephX Config Reference - Ceph Documentation (GitHub source)](https://github.com/ceph/ceph/blob/main/doc/rados/configuration/auth-config-ref.rst) - Verified auth config options (`auth_cluster_required`, `auth_service_required`, `auth_client_required`) and confirmed `auth_supported` is deprecated
- [Ceph Authentication Configuration - Red Hat Ceph Storage 4](https://docs.redhat.com/documentation/en-us/red_hat_ceph_storage/4/html/configuration_guide/ceph-authentication-configuration) - Cross-referenced auth disable procedure

## Issues Found

1. **Unquoted values in `cephConfig` YAML snippet.** The Rook documentation explicitly states "All values must be quoted so they are considered a string in YAML" for the `spec.cephConfig` section. The `none` values were unquoted. While `none` is not a YAML reserved keyword (unlike `true`/`false`/`null`), the Rook docs require quoting all values. Fixed by adding double quotes around each `"none"` value.

2. **Deprecated `--auth-supported=none` CLI flag in verification command.** The `auth_supported` option is a legacy Ceph configuration predating the modern three-way split (`auth_cluster_required`, `auth_service_required`, `auth_client_required`). It is not documented in current Ceph auth configuration references. Replaced the verification command with `ceph -n client.undefined --keyring /dev/null status`, which achieves the same goal (proving a non-existent client can connect without credentials) using current, supported flags.

## Review Notes
- The `ceph config set` commands are correct and use the centralized config database, which is the modern Ceph approach. The note that daemon restarts are required for auth settings is accurate, since authentication is negotiated at connection time.
- The security risks section is accurate: disabling CephX does expose the cluster to unauthenticated admin access, OSD impersonation, and loss of audit trail. The note about RGW S3 credentials being separate from CephX is also correct.
- The monitor deployment naming convention (`rook-ceph-mon-a`, `-b`, `-c`) and OSD deployment discovery via grep are consistent with standard Rook naming patterns.
- The post appropriately emphasizes that CephX should never be disabled in production and provides clear re-enablement instructions.
