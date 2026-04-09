# Validation Summary: How to Manage MDS Roles and Failover in CephFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- MDS (Metadata Server) daemon management
- Kubernetes (kubectl)
- CephFilesystem CRD (Custom Resource Definition)

## Sources Consulted
- Rook CephFilesystem CRD documentation (https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- Rook source code: `pkg/daemon/ceph/client/filesystem.go` and `pkg/operator/ceph/file/filesystem.go` (confirming `activeStandby` behavior)
- Ceph MDS Config Reference (https://docs.ceph.com/en/reef/cephfs/mds-config-ref/)
- Ceph source code: `src/common/options/mds.yaml.in` (confirming config option definitions and service assignments)
- Ceph-users mailing list thread on MDS/MON config variables and failover delay

## Issues Found
1. **Non-existent config option `mds_failure_timeout`**: The post included the command `ceph config set mon mds_failure_timeout 30`. This config option does not exist in Ceph (not present in any config YAML in `src/common/options/`, not in legacy config options, and not referenced in official documentation). The command would either be silently ignored or rejected depending on Ceph version, and has no effect on failover behavior. **Fix**: Removed the invalid `mds_failure_timeout` command and adjusted the surrounding text to clarify that `mds_beacon_grace` (default 15 seconds) is the config option that controls MDS failover detection timing.

## Review Notes
- The claim that `activeStandby: true` deploys a standby-replay MDS was verified as correct. Rook's operator code explicitly calls `ceph fs set <fsName> allow_standby_replay true` when `activeStandby` is enabled, so the standby MDS does enter standby-replay mode automatically.
- The `mds_beacon_grace` option is registered under the `mds` service in Ceph's config framework (defined in `mds.yaml.in`), so `ceph config set mds mds_beacon_grace 15` uses the correct entity type.
- The separate "Enable Standby-Replay Mode via CLI" section is technically redundant when `activeStandby: true` is set (since Rook sets it automatically), but it remains useful as a reference for users who want to manage the setting independently of the CRD.
