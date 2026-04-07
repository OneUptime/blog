# Validation Summary: How to Repair MDS Ranks in CephFS

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- MDS (Metadata Server) ranks and journal management
- `cephfs-journal-tool` CLI
- `cephfs-data-scan` CLI
- kubectl

## Sources Consulted
- Ceph official documentation: CephFS disaster recovery (https://docs.ceph.com/en/latest/cephfs/disaster-recovery/)
- Ceph official documentation: cephfs-journal-tool man page (https://docs.ceph.com/en/latest/man/8/cephfs-journal-tool/)
- Ceph official documentation: cephfs-data-scan (https://docs.ceph.com/en/latest/man/8/cephfs-data-scan/)
- Rook documentation: Rook Ceph toolbox (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found
1. **Incorrect subcommand for recovering dentries**: The post used `cephfs-journal-tool --rank=cephfs:0 journal recover-dentries`. The correct command is `cephfs-journal-tool --rank=cephfs:0 event recover_dentries` — `recover_dentries` is a subcommand of the `event` mode (not `journal`), and uses an underscore, not a hyphen.

2. **Wrong pool name for `cephfs-data-scan` commands**: Both `scan_extents` and `scan_inodes` take the **data pool** as their argument, not the metadata pool. The post passed `cephfs-metadata` but the correct pool is the data pool, which in Rook's default CephFS configuration is `cephfs-data0`. Changed both occurrences.

## Review Notes
- The overall workflow (fail MDS, fail filesystem, inspect/recover/reset journal, scan data, bring filesystem back) is correct and follows the recommended Ceph disaster recovery procedure.
- The post could mention running `cephfs-data-scan init` before the scan commands if the metadata pool is severely damaged, but this is not always required and omitting it is not an error.
- Users should be aware that the actual data pool name may differ from `cephfs-data0` depending on their Rook CephFilesystem CRD configuration. They can check with `ceph osd pool ls`.
