# Validation Summary: How to Set Replicas Per Failure Domain in Rook Block Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (CRUSH maps, block pools, placement groups)
- Kubernetes (CRDs, StorageClass, kubectl)
- CSI (ceph-csi RBD provisioner)

## Sources Consulted
- Rook CephBlockPool CRD source code: `pkg/apis/ceph.rook.io/v1/types.go` (PoolSpec and ReplicatedSpec structs)
- Rook official documentation: `Documentation/CRDs/Block-Storage/ceph-block-pool-crd.md` on GitHub
- Rook example pool manifest: `deploy/examples/pool.yaml` on GitHub

## Issues Found
- **`failureDomain` incorrectly nested under `spec.replicated`**: In all three CephBlockPool YAML examples (Steps 2, 4, and 5), `failureDomain` was placed inside `spec.replicated`. According to the Rook CRD definition, `failureDomain` is a field on `PoolSpec` (i.e., `spec.failureDomain`), not on `ReplicatedSpec` (i.e., not `spec.replicated.failureDomain`). Moved `failureDomain` to the correct level (`spec.failureDomain`) in all three YAML manifests.

## Review Notes
- The `subFailureDomain` field is correctly placed under `spec.replicated` per the CRD definition.
- The `replicasPerFailureDomain` field is correctly placed under `spec.replicated` per the CRD definition.
- The formula `total replicas = replicasPerFailureDomain x number of failure domains` is accurate per Rook documentation.
- The StorageClass configuration uses correct CSI secret names and parameters for rook-ceph RBD.
- The constraint about minimum OSDs per failure domain is accurate; with `subFailureDomain: host`, each failure domain needs at least `replicasPerFailureDomain` distinct hosts with OSDs.
- All `ceph` CLI commands and `kubectl` commands are syntactically correct.
