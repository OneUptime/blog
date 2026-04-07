# Validation Summary: How to Trigger Manual Compaction via Admin Socket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (BlueStore, RocksDB, BlueFS)
- Rook (Ceph operator for Kubernetes)
- Ceph Admin Socket
- Linux system tools (journalctl, watch)

## Sources Consulted
- Ceph official documentation on admin socket commands: https://docs.ceph.com/en/latest/man/8/ceph/#osd
- Ceph BlueStore documentation: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph admin socket reference: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/#using-the-admin-socket
- RocksDB compaction documentation as used by Ceph BlueStore

## Issues Found

1. **Incorrect description of `compact` command**: The post described `ceph daemon osd.0 compact` as "Compact the BlueStore allocation database." This command actually compacts both RocksDB and BlueFS together. Fixed the comment to "Compact RocksDB and BlueFS."

2. **Non-existent `bluestore bluefs compact` command**: The post listed `ceph daemon osd.0 bluestore bluefs compact` as a separate command for compacting RocksDB metadata. This is not a valid admin socket command; the `compact` command already handles both RocksDB and BlueFS. Removed this invalid command.

3. **Incorrect fragmentation score command**: `ceph daemon osd.0 bluestore allocator fragmentation score` is not valid. The correct command is `bluestore allocator score` (without "fragmentation" in the path). Fixed.

4. **Incorrect BlueFS stats command prefix**: `ceph daemon osd.0 bluestore bluefs stats` should be `ceph daemon osd.0 bluefs stats` (no `bluestore` prefix). Fixed.

5. **Non-existent `bluestore stats` command**: `ceph daemon osd.0 bluestore stats` is not a standard admin socket command. Replaced with `ceph daemon osd.0 perf dump bluestore` which correctly dumps BlueStore performance counters.

6. **Incorrect `bluestore compact` command**: `ceph daemon osd.0 bluestore compact` should be just `ceph daemon osd.0 compact`. Fixed.

7. **Non-existent `bluestore rocksdb stats` command**: `ceph daemon osd.0 bluestore rocksdb stats` is not a standard command. Replaced with `ceph daemon osd.0 perf dump rocksdb` to show RocksDB performance counters.

8. **Incorrect summary**: The summary incorrectly described `compact` and `bluestore bluefs compact` as separate operations for different purposes. Fixed to reflect that `compact` handles both RocksDB and BlueFS compaction.

## Review Notes
- The `ceph daemon` commands require running from a host that has access to the OSD's admin socket (typically at `/var/run/ceph/*/ceph-osd.*.asok`). In a Rook/Kubernetes environment, these commands must be run from within the OSD pod using `kubectl exec`, which the post does not mention. This would be a useful addition but is not a technical error in the existing content.
- The script for compacting all OSDs uses `ceph daemon osd.$osd compact` which requires local admin socket access. In a distributed cluster, this would only work on OSDs local to the host. For remote OSDs, `ceph tell osd.$osd compact` would be the correct approach. This is a practical limitation worth noting but not strictly an error in the commands shown.
- The 30-second sleep between OSD compactions in the batch script is arbitrary and may not be sufficient for large OSDs. The post acknowledges this is a wait period but does not explain how to verify compaction has completed.
