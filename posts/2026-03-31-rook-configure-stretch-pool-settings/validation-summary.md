# Validation Summary: How to Configure Stretch Pool Settings in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (stretch clusters, CRUSH rules, replicated pools)
- Kubernetes (CephBlockPool CRD, StorageClass, kubectl)
- CSI (Ceph RBD CSI driver)

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph stretch cluster documentation: https://docs.ceph.com/en/reef/rados/operations/stretch-mode/
- Rook stretch cluster guide: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/
- Related blog posts in repository (`rook-replicas-per-failure-domain`, `rook-assign-crush-rules-to-pools`) for cross-referencing CRD field usage and CLI command syntax
- Ceph pool operations documentation: https://docs.ceph.com/en/reef/rados/operations/pools/

## Issues Found
No technical issues found.

## Review Notes
- The post uses `spec.parameters.crush_rule: stretch_rule` to assign the CRUSH rule. While this works, the more idiomatic Rook approach for stretch clusters is to use `spec.failureDomain: datacenter` combined with `spec.replicated.replicasPerFailureDomain: 2`, which lets Rook create and manage the CRUSH rule automatically. This is a stylistic preference, not a correctness issue.
- The `ceph osd pool set <pool> crush_rule <rule_name>` command correctly uses the rule name (not numeric ID), which is supported in current Ceph versions (Quincy and later).
- The StorageClass provisioner name `rook-ceph.rbd.csi.ceph.com` and secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) are the correct defaults for a standard Rook deployment in the `rook-ceph` namespace.
- The replication model (size=4, 2 copies per site, min_size=2) is the standard and well-documented configuration for Ceph stretch clusters.
