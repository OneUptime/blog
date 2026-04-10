# Validation Summary: How to Understand Write-Ahead Logging for Data Safety in BlueStore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph BlueStore
- Write-Ahead Logging (WAL)
- RocksDB (BlueStore metadata backend)
- ceph-volume LVM provisioning

## Sources Consulted
- Ceph BlueStore documentation: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph ceph-volume documentation: https://docs.ceph.com/en/latest/ceph-volume/
- RocksDB tuning options: https://github.com/facebook/rocksdb/wiki/RocksDB-Tuning-Guide

## Issues Found

1. **Rook YAML used non-standard config keys**: The post used `walDevice` and `databaseDevice` as separate config keys in the Rook CephCluster device config. The documented Rook CRD config key is `metadataDevice`, which places both the RocksDB DB and WAL on the specified device. Replaced both keys with a single `metadataDevice: nvme0n1`.

2. **WAL Device diagram label was misleading**: The diagram labeled the WAL Device column as "Pending writes." The `block.wal` device stores the RocksDB write-ahead log (metadata journal), not pending data writes. Changed the label to "RocksDB WAL."

3. **Fabricated BlueStore perf counter names**: The post listed `bluestore_wal_ops` and `bluestore_wal_bytes` as key metrics. These do not exist in BlueStore's perf counters. Replaced with the correct counter names: `bluestore_deferred_write_ops` and `bluestore_deferred_write_bytes`.

4. **RocksDB sync settings comment was backwards**: The comment stated "Sync RocksDB WAL on every write (default: true for safety)" for the options `wal_bytes_per_sync=0,bytes_per_sync=0`. In RocksDB, setting these to 0 actually disables periodic background syncing — it does not enable per-write sync. Corrected the comment to "Disable periodic background sync in RocksDB (relies on BlueStore's own sync)."

## Review Notes
- The post's 4-step write sequence is a simplification. In BlueStore, large/aligned writes bypass the WAL and go directly to the block device. Only small/unaligned writes use the deferred write mechanism (which journals data alongside metadata in RocksDB). The RocksDB WAL (`block.wal`) is specifically for metadata transactions, not general data journaling. The post's description is a reasonable high-level conceptual model but readers implementing production systems should consult Ceph docs for the full picture.
- The `bluestore_sync_submit_transaction` config option could not be definitively verified against current Ceph documentation. It was left as-is since it is a plausible config option name and follows Ceph's naming conventions.
- The `ceph-volume lvm create` command with `--block.wal` and `--block.db` flags is correct.
- The WAL sizing recommendation (512 MB to 4 GB) and the `bluestore_block_wal_size` value of 2 GB are reasonable and align with community recommendations.
