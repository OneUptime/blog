# Validation Summary: How to Deploy the CephRBDMirror Daemon in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RBD Mirroring (rbd-mirror daemon)
- CephRBDMirror Custom Resource Definition
- Kubernetes (kubectl, pod scheduling, anti-affinity)
- Ceph Prometheus metrics

## Sources Consulted
- Rook CephRBDMirror CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-rbd-mirror-crd/
- Ceph RBD Mirroring documentation: https://docs.ceph.com/en/latest/rbd/rbd-mirroring/
- Ceph CLI reference for `rbd mirror` commands: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph Prometheus module metrics: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Orchestrator module documentation: https://docs.ceph.com/en/latest/mgr/orchestrator/
- Rook GitHub source (rbd mirror controller): https://github.com/rook/rook/tree/master/pkg/operator/ceph/cluster/rbd

## Issues Found

1. **Invalid command `ceph service dump`**: The command `ceph service dump | grep rbd-mirror` is not a standard Ceph CLI command. Replaced with `ceph -s | grep rbd-mirror`, which shows the cluster status summary including active rbd-mirror daemons.

2. **Invalid command `ceph orch ls --service-type`**: While the orchestrator module is available in Rook, `ceph orch ls` lists services, not individual daemon instances. Replaced with `ceph orch ps --daemon-type rbd-mirror`, which lists running daemon instances and is more useful for verifying the daemon is running.

3. **Invalid command `ceph mirror status`**: This is not a valid Ceph command. The correct command for checking mirroring status is `rbd mirror pool status <pool-name>`. Replaced with `rbd mirror pool status replicapool` to match the pool name used elsewhere in the post.

4. **Incorrect Prometheus metric names**: The metric names listed were non-standard. Fixed:
   - `ceph_rbd_mirror_snapshot_sync_bytes` -> `ceph_rbd_mirror_snapshot_image_sync_bytes`
   - `ceph_rbd_mirror_snapshot_sync_time` -> `ceph_rbd_mirror_snapshot_image_sync_time`
   - `ceph_rbd_mirror_replay_latency_sum` -> `ceph_rbd_mirror_replay_latency`

## Review Notes
- The CephRBDMirror CRD spec (apiVersion, kind, spec fields) is correct per official Rook documentation.
- The pod label `app=rook-ceph-rbd-mirror` is consistent with Rook's labeling conventions.
- The `rbd mirror pool info` output format shown is accurate for the documented output structure.
- The architectural explanation that the rbd-mirror daemon runs on the secondary cluster and pulls from the primary is correct.
- The placement spec using podAntiAffinity is a valid and recommended pattern for HA deployments.
- Prometheus metric availability depends on the Ceph version and whether the Prometheus manager module is enabled; the post could note this but it is not a technical error.
