# Validation Summary: How to Use Rook-Ceph with Kubernetes Operators

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (RBD CSI provisioner)
- Kubernetes StorageClasses
- CloudNativePG (PostgreSQL Operator)
- Strimzi (Apache Kafka Operator)
- Redis Enterprise Operator
- kubectl CLI

## Sources Consulted
- Rook-Ceph official documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- CloudNativePG documentation: https://cloudnative-pg.io/documentation/current/
- Strimzi documentation: https://strimzi.io/docs/operators/latest/configuring
- Redis Enterprise Operator documentation: https://docs.redis.com/latest/kubernetes/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
No technical issues found.

## Review Notes
- The Strimzi Kafka example includes a ZooKeeper section, which is still supported but Strimzi also supports KRaft mode (ZooKeeper-less) for newer Kafka versions. This is not incorrect but could be noted as an alternative in a future update.
- The Strimzi and CloudNativePG YAML snippets are partial manifests focused on storage configuration. Required fields like `listeners` (Strimzi) are omitted, which is acceptable for a focused tutorial but readers should consult full examples from each operator's documentation for production deployments.
- All Rook-Ceph CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) and namespaces match the default Rook-Ceph installation values.
