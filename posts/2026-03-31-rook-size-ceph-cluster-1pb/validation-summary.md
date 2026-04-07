# Validation Summary: How to Size a Ceph Cluster for 1PB Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Erasure coding (EC 8+3)
- CRUSH maps
- Kubernetes (node labels, topology)
- crushtool (CRUSH map compilation/decompilation)
- PG autoscaler and balancer modules

## Sources Consulted
- Ceph official documentation: CRUSH map management and crushtool usage (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Rook documentation: CephBlockPool CRD spec, erasure coding configuration (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph documentation: Erasure coding profiles and overhead calculations (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Ceph documentation: PG autoscaler and balancer modules (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Kubernetes documentation: Well-known labels and topology keys (https://kubernetes.io/docs/reference/labels-annotations-taints/)

## Issues Found

1. **CRUSH map tool names were incorrect.** The post used `ceph-deosd` (to decompile) and `ceph-osd` (to compile) CRUSH maps. These tools do not exist. The correct tool is `crushtool` with `-d` flag to decompile and `-c` flag to compile. Fixed both occurrences.

2. **PG Autoscaler and Balancer commands missing kubectl exec.** The first `ceph` command was correctly wrapped in `kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- ...`, but the remaining four commands (`ceph balancer mode upmap`, `ceph balancer on`, `ceph mgr module enable pg_autoscaler`, `ceph config set ...`) were bare `ceph` commands that would fail outside the tools pod. Wrapped all commands in `kubectl exec`.

3. **Inconsistent capacity overhead factor.** The initial capacity calculations used a 0.8 utilization factor (dividing by 0.8, equivalent to multiplying by 1.25) to account for OSD overhead. However, the later calculation for 12-node usable capacity divided by 1.2 instead of 1.25. Fixed to divide by 1.25 for consistency, which changes the result from ~3.5PB to ~3.4PB usable.

4. **Device glob comment mismatch.** The device specification `/dev/sd[b-y]` matches 24 drives (letters b through y), but the inline comment said "20 drives per node". Fixed the comment to say "24 drives per node".

## Review Notes
- The network design section mentions "100GbE per node (replication)" for the cluster network. With erasure coding, this traffic is technically recovery/rebalancing rather than replication, but "replication" is commonly used loosely in this context and is not incorrect enough to warrant a change.
- The Rook CephBlockPool CRD YAML is correct for current Rook v1.x releases.
- The use of `topology.kubernetes.io/zone` for rack labels works with Rook's topology-aware placement, though `topology.rook.io/rack` is another common choice. Both are valid approaches.
- All erasure coding math (EC 8+3 overhead = 1.375x, minimum 11 failure domains) is correct.
