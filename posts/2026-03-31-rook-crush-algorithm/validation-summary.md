# Validation Summary: How to Understand the CRUSH Algorithm in Ceph

## Status
validated

## Post Type
Tutorial / Conceptual Guide

## Technologies Covered
- Ceph (CRUSH algorithm, OSDs, placement groups, CRUSH maps)
- Rook (Rook-Ceph operator for Kubernetes)
- Kubernetes (kubectl commands for Rook toolbox)
- crushtool (CRUSH map decompilation utility)

## Sources Consulted
- Rook official documentation — Ceph Toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph official documentation — CRUSH Maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation — CRUSH Map editing: https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/
- Rook official documentation — CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Original CRUSH paper by Sage A. Weil et al. (2006): "CRUSH: Controlled, Scalable, Decentralized Placement of Replicated Data"

## Issues Found
1. **Incorrect Rook toolbox kubectl command**: The post used `kubectl exec -it rook-ceph-tools -n rook-ceph -- bash` which references a bare pod name. The Rook toolbox is deployed as a Kubernetes Deployment, so the pod name includes a random suffix and cannot be addressed by the bare name. Fixed to `kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- bash` per the official Rook documentation.

## Review Notes
- The pseudocode `hash(object_name) % num_pgs = PG_ID` is a simplification. In practice, Ceph hashes both the pool ID and object name together, and uses a bitmask operation rather than simple modulo. This is acceptable for a conceptual overview.
- All Ceph CLI commands (`ceph osd crush dump`, `ceph osd getcrushmap`, `crushtool -d`, `ceph osd tree`, `ceph osd crush reweight`, `ceph osd map`) are correct and current.
- The sample CRUSH rule syntax is accurate for a decompiled CRUSH map.
- The CephBlockPool YAML uses the correct `ceph.rook.io/v1` API version and valid spec fields (`failureDomain`, `replicated.size`).
- The `ceph osd map` output example format is representative of actual Ceph output.
- The description of straw2 as the bucket selection algorithm is correct — it is the default in modern Ceph.
