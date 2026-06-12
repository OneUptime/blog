# Validation Summary: How to Implement Ceph CephFS Snapshots

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Ceph
- CephFS
- CephFS snapshots
- Ceph CLI
- Linux shell scripting
- cron
- systemd timers
- PostgreSQL online backup functions

## Sources Consulted
- CephFS Snapshots, Ceph Documentation: https://docs.ceph.com/en/latest/cephfs/snapshots/
- Mount CephFS using Kernel Driver, Ceph Documentation: https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/
- CephFS Client Capabilities, Ceph Documentation: https://docs.ceph.com/en/latest/cephfs/client-auth/
- Ceph administration tool manual, Ceph Documentation: https://docs.ceph.com/en/latest/man/8/ceph/
- CephFS Troubleshooting, Ceph Documentation: https://docs.ceph.com/en/latest/cephfs/troubleshooting/
- CephFS Snapshots developer notes, Ceph Documentation: https://docs.ceph.com/en/reef/dev/cephfs-snapshots/
- PostgreSQL Backup Control Functions, PostgreSQL Documentation: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL Continuous Archiving and PITR, PostgreSQL Documentation: https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL 15 release notes, PostgreSQL Documentation: https://www.postgresql.org/docs/15/release-15.html

## Issues Found
- The introductory claim said snapshots have no performance impact. Changed it to "minimal immediate overhead" to avoid an absolute claim that is not guaranteed in production.
- The snapshot architecture text and workflow diagram implied that the MDS marks all data objects for COW during snapshot creation. Updated this to describe MDS snapshot metadata allocation and SnapContext updates, matching Ceph's documented snapshot model.
- The post recommended `ceph config set mds mds_allow_snaps true` for granular snapshot permissions. Replaced it with CephX MDS capability guidance using the `s` flag, which current Ceph documentation identifies as required for snapshot create/delete permissions.
- The CephFS mount example used older monitor-address device syntax and placed a secret directly on the command line. Updated it to the current kernel mount helper syntax with `mon_addr` and `secretfile`.
- The monitoring script parsed `ceph mds stat -f json` with a brittle `.fsmap.up` jq expression. Changed it to check the standard `ceph mds stat` output for `up:active`.
- Two snapshot-count examples used `ls | wc -l || echo 0` under `pipefail`, which can produce unreliable output when no snapshots exist. Replaced those with `find` guarded by a directory existence check.
- The PostgreSQL consistency example used `pg_start_backup()` and `pg_stop_backup()`, which were renamed in PostgreSQL 15. Updated the example to `pg_backup_start()` and `pg_backup_stop()`, and preserved the backup label data returned by `pg_backup_stop()`.
- The troubleshooting section used `ceph daemon mds.$(hostname) ops`, which is not the documented MDS in-flight operation dump command. Replaced it with `dump_ops_in_flight`.
- The performance section suggested "merging" snapshots across tiers. Reworded it to pruning high-frequency snapshots according to retention tiers, since CephFS does not provide a snapshot merge command.

## Review Notes
The Bash fenced blocks were checked with `bash -n` after edits. Commands that require a live Ceph cluster were verified against official documentation rather than executed locally.
