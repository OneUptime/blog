# Validation Summary: How to Configure Ceph for High-IOPS Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ceph RADOS and OSDs
- BlueStore and RocksDB
- RBD/librbd/kernel RBD
- CRUSH rules and placement groups
- Ceph Manager Prometheus metrics
- Linux networking, sysctl, and ethtool
- fio benchmarking
- Prometheus and Grafana

## Sources Consulted
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph OSD Config Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph Network Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph ceph-volume man page: https://docs.ceph.com/en/latest/man/8/ceph-volume/
- Ceph rbd man page: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph rbdmap man page: https://docs.ceph.com/en/latest/man/8/rbdmap/
- Ceph RBD Config Settings: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph Prometheus Module: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Monitoring Overview: https://docs.ceph.com/en/latest/monitoring/
- fio documentation: https://fio.readthedocs.io/en/latest/fio_doc.html
- Ceph source option definitions: https://github.com/ceph/ceph/tree/main/src/common/options

## Issues Found
- The `ceph-volume lvm create` example used `--block-wal` and `--block-db`; the documented options are `--block.wal` and `--block.db`. Updated the command.
- The BlueStore tuning snippet included unsupported or obsolete options (`bluestore_devs_source`, `bluestore_threads`) and implied that `bluestore_cache_kv_ratio` alone determines data-cache remainder. Removed the unsupported options and added `bluestore_cache_meta_ratio` so the cache math matches Ceph documentation.
- The OSD tuning snippets included unsupported or obsolete thread/cache options (`osd_memory_cache_autotune`, `osd_op_threads`, `osd_disk_threads`, `osd_recovery_threads`). Removed them and adjusted troubleshooting flowchart text to avoid recommending those knobs.
- The messenger tuning included `ms_tcp_sendbuf`, which is not listed in current Ceph configuration documentation/source options. Removed it and kept the documented receive-buffer option.
- The RBD image creation example passed multiple features as one comma-separated `--image-feature` value and omitted the `striping` feature required for non-default striping. Changed it to repeat `--image-feature`, added `striping`, and documented feature dependency order for existing images.
- The `/etc/ceph/rbdmap` example used invalid option separation for `queue_depth`. Updated it to the documented comma-separated `options='rw,queue_depth=128'` form.
- The fio read test used `lat_percentile=99.9`, which is not the fio option for selecting reported percentiles. Replaced it with `percentile_list=99.9`.
- The complete `ceph.conf` example used `mgr_modules` as a static config value. Replaced it with commented `ceph mgr module enable ...` commands, matching the documented module enable workflow.
- Prometheus latency queries divided raw counters directly and compared seconds to a millisecond threshold. Updated them to use rates and multiply by 1000 for milliseconds.
- The Grafana examples used a non-existent `osd` label and a histogram bucket metric not exported by Ceph's Prometheus module. Updated the label to `ceph_daemon` and replaced the histogram percentile example with average write latency.
- The pool IOPS query grouped by a `pool` label that is not present on Ceph pool metrics. Updated it to join with `ceph_pool_metadata` and group by pool name.
- The diagnostic command for blocked operations used `dump_blocked_ops`; current Ceph health-check documentation recommends querying current ops with `ceph daemon osd.<id> ops`. Updated the command.

## Review Notes
The post is now technically valid as a general Ceph high-IOPS tuning guide, but many performance settings remain workload- and hardware-dependent. Future revisions could add stronger caveats around benchmarking before changing BlueStore/RocksDB/cache settings and around whether a dedicated cluster network helps on modern 25GbE or faster deployments.
