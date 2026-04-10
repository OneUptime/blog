# Validation Summary: How to Set Up Ceph RBD Storage for MongoDB on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD block storage)
- Kubernetes (StorageClass, StatefulSet, PVC)
- MongoDB 7.0.5 (WiredTiger, oplog, replica sets)
- MongoDB Community Kubernetes Operator
- Ceph OSD pool management
- CSI (Container Storage Interface) for RBD

## Sources Consulted
- Rook Ceph documentation on RBD StorageClass configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- MongoDB Community Kubernetes Operator CRD reference: https://github.com/mongodb/mongodb-kubernetes-operator
- MongoDB 7.0 manual — WiredTiger configuration options: https://www.mongodb.com/docs/manual/reference/configuration-options/#storage-wiredtiger-options
- MongoDB 7.0 manual — replSetResizeOplog command: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB 7.0 manual — mongosh (replacement for legacy mongo shell): https://www.mongodb.com/docs/mongodb-shell/
- Ceph documentation — OSD pool create and RBD pool init: https://docs.ceph.com/en/latest/rados/operations/pools/

## Issues Found
1. **`mongo` shell used instead of `mongosh` (line 117)**: The oplog configuration section used the legacy `mongo` shell command (`mongo -u admin -p`) to connect to MongoDB 7.0.5. The legacy `mongo` shell was deprecated in MongoDB 5.0 and removed entirely in MongoDB 6.0. Since the post targets MongoDB 7.0.5, the correct shell is `mongosh`. The monitoring section already correctly used `mongosh`, making this an inconsistency. Changed `mongo` to `mongosh`.

## Review Notes
- The Ceph pool creation uses manual `ceph osd pool create` commands via the tools pod. In production Rook deployments, a `CephBlockPool` CRD is typically preferred as it is declarative and managed by the Rook operator. The manual approach shown is still valid but less idiomatic for Rook-managed clusters.
- The `ceph osd pool create mongodb-pool 64 64` command uses 64 placement groups. This is reasonable for a small cluster but may need tuning based on the number of OSDs (Ceph's PG autoscaler, enabled by default in newer Ceph versions, can handle this automatically).
- The WiredTiger `cacheSizeGB: 2` is a static value. In production, this should typically be set to roughly 50% of available RAM minus 1 GB, adjusted for the container's memory limits.
- The `operationProfiling.slowOpThresholdMs` setting in the WiredTiger tuning section is technically a profiling setting, not a WiredTiger setting. It is still a valid `additionalMongodConfig` entry but its placement under the "Tuning WiredTiger" heading is slightly misleading. This is a minor organizational note, not a technical error.
