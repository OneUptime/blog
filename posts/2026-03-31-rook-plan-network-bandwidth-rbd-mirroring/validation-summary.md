# Validation Summary: How to Plan Network Bandwidth for RBD Mirroring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes-based Ceph orchestration)
- Ceph RBD (RADOS Block Device) mirroring (journal-based and snapshot-based)
- `rbd-mirror` daemon configuration
- Prometheus alerting rules
- Linux `tc` (traffic control) for QoS / HTB traffic shaping

## Sources Consulted
- Ceph official documentation: RBD Mirroring (https://docs.ceph.com/en/reef/rbd/rbd-mirroring/)
- Ceph official documentation: Monitoring OSDs and PGs (https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/)
- Ceph source code for `rbd-mirror` perf counters (`src/tools/rbd_mirror/image_replayer/journal/Replayer.cc`)
- Ceph source code for rbd-mirror config options (`src/common/options/rbd-mirror.yaml.in`)
- Ceph GitHub PRs #27670 (journal fetch auto-tuning) and issue #51964 (doc cleanup for `rbd_mirror_journal_max_fetch_bytes`)

## Issues Found
1. **Prometheus metric names are not real Ceph metrics.** The alert rules reference `ceph_rbd_mirror_replay_lag_seconds` and `ceph_rbd_mirror_image_status{state!="replaying"}`, neither of which are metrics exported by Ceph's MGR Prometheus module. The real rbd-mirror perf counters exported to Prometheus include `replay_latency` (with `_sum`/`_count` suffixes), `replay_bytes`, and `entries`. Added a note to the post clarifying that the metric names are illustrative and readers should check their Ceph MGR Prometheus module output for actual available metrics.

## Review Notes
- **`rbd_mirror_journal_max_fetch_bytes` is a batch-size setting, not a bandwidth throttle.** It controls the maximum bytes fetched per journal read, not a sustained bandwidth cap. In recent Ceph versions (post-PR #27670), this value is auto-tuned based on a memory target, and the config option serves as a minimum floor for the auto-tuner. The option has also been removed from current Ceph documentation (issue #51964). The post frames it as part of "bandwidth throttling," which is somewhat misleading but not strictly wrong since reducing fetch sizes can indirectly limit throughput.
- **`rbd_mirror_concurrent_image_syncs`** is correctly documented with default value 5, matching the Ceph source.
- **All CLI commands are valid**: `ceph osd pool stats`, `rbd perf image iostat`, `rbd mirror pool status --verbose` are all confirmed against Ceph documentation and source.
- **The `master_position`/`entries_behind_master` sample output** uses correct terminology per current Ceph documentation.
- **The `tc` QoS commands are syntactically correct** but incomplete for a production setup — they define HTB classes but lack `tc filter` rules to classify mirroring traffic into the reserved class (1:10). Without filters, all traffic falls to the default class (1:30). This is an omission in the tutorial rather than a technical error.
- **Bandwidth calculation for snapshot-based mirroring** (50 GiB / 1 hour = 14.2 MiB/s) is mathematically correct (51200 MiB / 3600s = 14.22 MiB/s).
