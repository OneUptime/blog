# Validation Summary: How to Plan a Disaster Recovery Strategy for Rook-Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- Velero (Kubernetes backup tool)
- RBD mirroring (Ceph block device replication)

## Sources Consulted
- Rook official stretch cluster documentation and example YAML: https://github.com/rook/rook/blob/master/deploy/examples/cluster-stretched.yaml
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Velero CLI reference for `velero schedule create`: https://velero.io/docs/main/resource-filtering/
- Ceph RBD mirroring documentation: https://docs.ceph.com/en/latest/rbd/rbd-mirroring/
- Ceph msgr2 protocol documentation (port 3300): https://docs.ceph.com/en/latest/rados/configuration/msgr2/

## Issues Found
1. **Missing `subFailureDomain` in stretch cluster CephCluster YAML.** The `stretchCluster` configuration was missing the `subFailureDomain: host` field, which is required per official Rook documentation to define how data replicas are distributed within each zone. Added `subFailureDomain: host` under `stretchCluster`.

## Review Notes
- The Velero flag `--include-cluster-resources=true` is deprecated as of Velero v1.11+ in favor of `--include-cluster-scoped-resources`. The old flag still works for backward compatibility, so this is not an error, but readers using Velero v1.11+ should use the newer flag.
- The CephBlockPool shown (`failureDomain: host`, `size: 3`) is valid for standard (non-stretch) Ceph deployments. However, if used with the stretch cluster configuration shown above it, a stretch-aware pool would require `failureDomain: zone`, `replicated.size: 4`, `replicasPerFailureDomain: 2`, and `subFailureDomain: host`. The blog presents these as general DR architecture patterns rather than a single unified config, so no change was made, but readers should be aware of this distinction.
- The `arbiter: false` on non-arbiter zones is redundant (it defaults to `false`) but not incorrect. The canonical Rook examples omit it on non-arbiter zones.
- All CLI commands (`velero schedule create`, `rbd mirror pool enable`, `kubectl` label selectors) are syntactically correct and use valid flags.
- Ceph monitor port 3300 (msgr2 protocol) is correct for modern Ceph deployments (Nautilus v14.2+).
- RPO/RTO definitions and failure scenario classifications are accurate.
