# Validation Summary: How to Recover a Ceph Cluster After Total Power Loss

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- systemctl / systemd (service management)
- smartctl (disk health monitoring)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation — Monitoring a Cluster: https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Ceph official documentation — Monitor Config Reference: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph official documentation — Operating a Cluster: https://docs.ceph.com/en/latest/rados/operations/operating/
- Ceph official documentation — Pools: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph man page — ceph(8): https://docs.ceph.com/en/latest/man/8/ceph/
- Rook Disaster Recovery documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/disaster-recovery/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

### Issue 1: Incorrect quorum requirement claim
- **What was wrong:** The text stated "If only one monitor starts but quorum requires 3", implying all 3 monitors are needed for quorum. Ceph uses Paxos consensus and requires only a majority (N/2 + 1). With 3 monitors, quorum requires 2, not 3.
- **What was changed:** Updated to "If only one monitor starts but quorum requires a majority (2 out of 3)".
- **Why:** The original statement could mislead operators into thinking all monitors must be online before the cluster can function, which is incorrect and defeats the purpose of running an odd number of monitors for fault tolerance.

### Issue 2: Invalid pool-level deep-scrub command
- **What was wrong:** The command `ceph osd pool deep-scrub <pool>` is not a valid Ceph CLI command. Deep scrub can be initiated per placement group (`ceph pg deep-scrub <pgid>`) or per OSD (`ceph osd deep-scrub <osd>`), but not directly per pool.
- **What was changed:** Replaced `ceph osd pool ls | xargs -I{} ceph osd pool deep-scrub {}` with `for osd in $(ceph osd ls); do ceph osd deep-scrub osd."$osd"; done`, which iterates over all OSDs and initiates deep scrub on each.
- **Why:** The original command would fail with an unrecognized command error. The replacement correctly triggers deep scrub across all PGs by iterating over OSDs.

## Review Notes
- The `rook.io/force-reconcile` annotation used in the Rook-Specific Recovery section is not an officially documented Rook annotation. However, it works in practice because any annotation change to the CephCluster CR triggers the Kubernetes watch mechanism, causing the Rook operator to reconcile. This is a common community pattern for Kubernetes operators. The officially documented alternatives include restarting the Rook operator pod or using `kubectl rook-ceph operator restart`.
- The `ceph osd pool unset <pool> nodeep-scrub` command is valid but less commonly documented than the equivalent `ceph osd pool set <pool> nodeep-scrub false`. Both work.
- The post does not specify Ceph or Rook versions. The commands and procedures are accurate for Ceph Quincy (17.x) and Reef (18.x) with Rook 1.12+.
- The overall recovery procedure follows established best practices: hardware verification, monitor quorum restoration, noout flag, gradual OSD startup, and post-recovery integrity checks.
