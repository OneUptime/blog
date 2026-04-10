# Validation Summary: How to Set Up Ceph RBD Storage for Redis on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Redis 7.2 (in-memory data store with persistence)
- Kubernetes StatefulSets and StorageClasses
- OpsTree Redis Operator (RedisCluster CRD)

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/management/persistence/
- Redis configuration reference: https://redis.io/docs/management/config/
- Rook Ceph RBD StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph OSD pool create documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/concepts/storage/storage-classes/
- OpsTree Redis Operator documentation: https://ot-container-kit.github.io/redis-operator/

## Issues Found
1. **Incorrect comment for `activerehashing` directive**: The comment `# Disable transparent huge pages warning` was misleading. The `activerehashing yes` directive controls Redis's incremental hash table rehashing (rehashing the main dictionaries every 100ms to reduce latency spikes). It has nothing to do with transparent huge pages (THP). THP is a Linux kernel feature that must be disabled at the OS level (e.g., `echo never > /sys/kernel/mm/transparent_hugepage/enabled`), not via a Redis configuration directive. Changed the comment to `# Enable incremental rehashing`.

## Review Notes
- The post does not show how to create the `redis-config` ConfigMap referenced in the StatefulSet. Readers will need to create it from the redis.conf content shown later, e.g., `kubectl create configmap redis-config --from-file=redis.conf -n cache`. This is a minor omission but not a technical error.
- In Redis 7.0+, AOF uses Multi Part AOF (MP-AOF) with files stored in a subdirectory (`appendonlydir/` by default). The `appendfilename appendonly.aof` directive is still valid as it specifies the base name for the manifest file. This is correct but worth noting for readers debugging AOF file locations.
- The Ceph pool PG count of 32 is reasonable for a small/dedicated pool but may need tuning based on cluster size. Newer Ceph versions support PG autoscaling which could be mentioned.
