# Validation Summary: How to Add New OSDs to a Ceph Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (storage cluster)
- cephadm (Ceph orchestrator/deployment tool)
- Rook (Kubernetes operator for Ceph)
- CRUSH (Ceph's data placement algorithm)
- Kubernetes (container orchestration)

## Sources Consulted
- Ceph official documentation: Adding OSDs via cephadm — https://docs.ceph.com/en/latest/cephadm/services/osd/
- Ceph official documentation: OSD service specification — https://docs.ceph.com/en/latest/cephadm/services/osd/#advanced-osd-service-specifications
- Ceph official documentation: `ceph config set` command — https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Rook official documentation: CephCluster CR storage configuration — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph official documentation: CRUSH map management — https://docs.ceph.com/en/latest/rados/operations/crush-map/

## Issues Found

### Issue 1: Incorrect `ceph orch apply osd` syntax
- **What was wrong:** The command `ceph orch apply osd <hostname> --all-available-devices` incorrectly showed a hostname as a positional argument. The `--all-available-devices` flag on `ceph orch apply osd` creates a cluster-wide service definition that continuously consumes all available devices. It does not accept a hostname positional argument for per-host targeting (use an OSD service spec with placement constraints for that).
- **What was changed:** Removed the `<hostname>` argument and updated the comment from "on a host" to "across the cluster" to accurately reflect the command's cluster-wide behavior.
- **Why:** Using the incorrect syntax would produce a CLI error. The per-device command `ceph orch daemon add osd <hostname>:/dev/sdd` already covers the per-host case shown earlier in the same step.

### Issue 2: Non-existent `ceph osd set-option` command
- **What was wrong:** The post used `ceph osd set-option` to set OSD configuration parameters (e.g., `osd_recovery_max_active`, `osd_max_backfills`). This is not a valid Ceph CLI command.
- **What was changed:** Replaced all four occurrences of `ceph osd set-option` with `ceph config set osd`, which is the correct command for persistently setting configuration options on the OSD daemon class.
- **Why:** Running `ceph osd set-option` would fail with an unrecognized command error. The correct command is `ceph config set osd <key> <value>` for persistent configuration, or `ceph tell osd.* config set <key> <value>` for runtime-only changes.

## Review Notes
- The default value for `osd_max_backfills` is already 1 in current Ceph releases (Quincy, Reef), so the "Limit backfill operations" step setting it to 1 is effectively a no-op with default configuration. The "Restore defaults" section also restores it to 1, confirming no actual change. This is not technically incorrect but could be confusing to readers.
- The statement "By default, rebalancing uses all available bandwidth" is an oversimplification. Ceph has built-in defaults that limit recovery concurrency (e.g., `osd_recovery_max_active=3`, `osd_max_backfills=1`), so it does not literally use all bandwidth. However, this is a minor phrasing issue rather than a technical error.
- The `ceph osd perf` command shows per-OSD latency statistics, not data movement rates. It is still useful during rebalancing but `ceph status` or `ceph progress` would more directly show rebalancing throughput. This is a minor inaccuracy in the comment but the command itself is valid.
- The `ceph osd crush reweight` command works but `ceph osd reweight` (which sets the "reweight" value, not the CRUSH weight) is a different command with different semantics. The post correctly uses the CRUSH variant, which is appropriate for capacity-based weight adjustments.
