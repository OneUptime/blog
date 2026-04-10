# Validation Summary: How to Configure Ceph Audit Logging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Kubernetes (kubectl)
- Fluentd (log forwarding)
- CephX authentication

## Sources Consulted
- Rook CephObjectStore CRD documentation — https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook GatewaySpec source code (types.go) — https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Ceph RGW Config Reference — https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph MonCommands.h (`ceph log last` syntax) — https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph radosgw-admin man page — https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found
1. **Removed `type: s3` from CephObjectStore YAML**: The `spec.gateway.type` field does not exist in the Rook CephObjectStore CRD. The Rook GatewaySpec struct has no `type` field — RGW inherently provides S3 (and optionally Swift) without a type discriminator. The field was removed.

2. **Fixed misleading description of `radosgw-admin --op-mask` command**: The original text said "Enable ops log via radosgw-admin" but the `--op-mask` flag sets user permissions (what operations a user is allowed to perform), not operations logging. Changed the description to accurately reflect that the command sets the op-mask on the admin user. The actual ops log enabling is correctly handled by the `rgw_enable_ops_log` and `rgw_ops_log_rados` config options in the following code block.

## Review Notes
- The "Enable Audit Logging in Ceph" section configures CephX authentication and disables syslog, which are prerequisites for meaningful audit trails but do not directly enable audit logging. The actual audit log enabling (`mon_cluster_log_to_file: "true"`) is in the later "Configure CephCluster for Audit" section. This is not incorrect, but the section title could be more precise (e.g., "Configure Authentication for Audit Logging").
- The `mon_cluster_log_file` set to `/var/log/ceph/ceph.audit.log` will receive all cluster log channel messages (both cluster and audit channels), not just audit events. The filename suggests audit-only content, which could be misleading.
- The `ceph log last 50 audit` command syntax was verified as correct — `audit` is a valid channel name parameter and does not require a `*` prefix (the `*` value is a separate wildcard meaning "all channels").
- `spec.cephConfig` is a valid field in the Rook CephCluster CRD for setting Ceph configuration options.
- `rgw_enable_ops_log` and `rgw_ops_log_rados` are valid and correctly documented Ceph config options.
