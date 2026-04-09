# Validation Summary: How to Set Up Failure Domains for Stretch Clusters in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph CRUSH maps and rules
- Kubernetes CRDs (CephBlockPool)
- Ceph stretch clusters
- Ceph OSD management

## Sources Consulted
- Ceph documentation on CRUSH rules and `ceph osd crush rule create-replicated` syntax: the command takes `<name> <root> <type> [<class>]` where `<class>` is a device class (hdd, ssd, nvme), not a sub-failure domain
- Ceph documentation on CRUSH rule step types: `chooseleaf firstn` is used for replicated pools, `chooseleaf indep` is used for erasure-coded pools
- Rook CephBlockPool CRD specification (`pkg/apis/ceph.rook.io/v1/types.go`): confirmed `failureDomain`, `replicated.size`, `replicated.requireSafeReplicaSize`, `replicated.replicasPerFailureDomain`, `replicated.subFailureDomain`, and `deviceClass` are all valid fields
- Rook CRUSH rule generation logic (`pkg/daemon/ceph/client/crush_rule.go`): Rook auto-generates two-level CRUSH rules when `replicasPerFailureDomain` and `subFailureDomain` are specified

## Issues Found

1. **CRUSH rule command had invalid `host` argument**: The command `ceph osd crush rule create-replicated stretch-replicated default datacenter host` included `host` as the fourth positional argument. The fourth argument to `create-replicated` is the optional device class filter (e.g., `hdd`, `ssd`, `nvme`). `host` is a CRUSH bucket type, not a device class, so this would either fail or create a rule targeting a nonexistent device class. Removed `host` from the command.

2. **Incorrect explanation of rule behavior**: The text claimed the rule "chooses two distinct `datacenter` buckets, then chooses one `host` within each datacenter," describing a two-level rule. However, `create-replicated` generates a single `chooseleaf firstn 0 type datacenter` step, which distributes replicas across distinct datacenter buckets and selects leaf OSDs within each. Updated the explanation to accurately describe the single-level chooseleaf behavior.

3. **Wrong CRUSH step type in verification section**: The post stated the rule dump should show `step chooseleaf indep 2 type datacenter`. Two errors: (a) `indep` is the step mode for erasure-coded pools, while replicated pools use `firstn`; (b) the number should be `0` (meaning "use pool's replication size"), not `2`. Changed to `step chooseleaf firstn 0 type datacenter`.

## Review Notes
- The CephBlockPool CRD section is correct and well-explained. The `replicasPerFailureDomain: 2` with `subFailureDomain: host` configuration is the recommended Rook approach for stretch clusters, and Rook auto-generates the appropriate two-level CRUSH rule for this.
- The manual CLI pool creation section (using `create-replicated` followed by `size 4`) is a simpler approach that works in practice but does not guarantee an exact 2+2 replica distribution across datacenters. The CRD-based approach with `replicasPerFailureDomain` provides deterministic placement. Users following both approaches should be aware they produce different CRUSH rule structures.
- The `ceph osd out` test for simulating datacenter failure is a reasonable basic test, though it triggers rebalancing rather than simulating a sudden failure. For more realistic testing, `ceph osd set noout` before marking OSDs down would prevent immediate rebalancing.
