# Validation Summary: How to Set Up Ceph RBD Storage for Cassandra on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Cassandra 4.1.x
- Rook-Ceph (RBD block storage)
- Kubernetes StorageClass and PersistentVolumeClaims
- K8ssandra Operator (K8ssandraCluster CRD, API v1alpha1)
- Ceph OSD pool management
- nodetool CLI for Cassandra monitoring

## Sources Consulted
- Apache Cassandra 4.1 cassandra.yaml reference (disk_access_mode removal in 4.0, parameter name changes in 4.1)
- K8ssandra operator documentation (K8ssandraCluster CRD spec, cassandraYaml config passthrough)
- Rook-Ceph documentation (RBD CSI provisioner name, default secret names, StorageClass format)
- Ceph documentation (osd pool create syntax, rbd pool init command)

## Issues Found
1. **Removed `disk_access_mode: auto` parameter and its comment.** The `disk_access_mode` configuration parameter was removed from Cassandra in version 4.0 when memory-mapped I/O (mmap) support was dropped. Since the post targets Cassandra 4.1.3, this parameter is invalid and would be ignored or cause a startup warning. The associated comment ("Set disk access mode to mmap for RBD") was also misleading since the value was `auto`, not `mmap`, and the concept no longer applies in Cassandra 4.x. Removed both the comment line and the parameter line from the "Cassandra Configuration for RBD" section.

## Review Notes
- `compaction_throughput_mb_per_sec` was replaced by `compaction_throughput` (with data-rate unit suffix, e.g., `64MiB/s`) in Cassandra 4.1. The old name is still accepted for backward compatibility, so this is not an error, but future updates to the post could use the new name.
- `commitlog_sync_period_in_ms` was similarly replaced by `commitlog_sync_period: 10000ms` in Cassandra 4.1. The old name still works but is deprecated.
- The K8ssandra operator may internally handle translation of these deprecated parameter names, so they remain functional in the K8ssandraCluster manifest context.
- The pool creation commands use the older positional PG syntax (`ceph osd pool create <name> 64 64`). This is still fully supported but modern Ceph clusters often rely on the pg_autoscaler module instead.
- The post only creates a StorageClass for data but not for the commit log pool (`cassandra-commitlog`), despite creating both pools. A future update could add a second StorageClass and show how to use it for commit log separation in the K8ssandraCluster spec.
