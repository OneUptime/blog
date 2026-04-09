# Validation Summary: How to Configure TTL for Muted Health Checks in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster health monitoring)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- Bash scripting

## Sources Consulted
- Ceph official documentation — Monitoring a Cluster: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph official documentation — Health Checks (Reef): https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph source code — `MonCommands.h` (command definitions): https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph source code — `health_check.h` (mute struct and JSON serialization): https://github.com/ceph/ceph/blob/main/src/mon/health_check.h
- Ceph source code — `ceph_time.cc` (`parse_timespan` function for duration parsing): https://github.com/ceph/ceph/blob/master/src/common/ceph_time.cc
- Ceph PR #29422 — mon: add ability to mute health alerts: https://github.com/ceph/ceph/pull/29422

## Issues Found
1. **Invalid health check code `noscrub`** (High severity): In the "Maintenance Window Muting Pattern" script, the post used `ceph health mute noscrub $WINDOW`. However, `noscrub` is not a valid Ceph health check code. When the `noscrub` OSD flag is set via `ceph osd set noscrub`, the resulting health warning is reported under the code `OSDMAP_FLAGS`. The command `ceph health mute noscrub` would silently succeed but not actually mute anything. **Fixed** by changing `noscrub` to `OSDMAP_FLAGS`.

## Review Notes
- **Duration format table is incomplete but not wrong**: The post lists `m`, `h`, `d`, `w` as supported duration formats. Ceph's `parse_timespan` function also supports seconds (`s`/`sec`), months (`mo`/`month`), and years (`y`/`yr`). The listed formats are all valid and are the most commonly used ones, so this is not an error — just an incomplete list.
- **TTL field in JSON output is an absolute timestamp**: The post's Python scripts treat the `ttl` field as a relative/human-readable value (e.g., printing `expires in {ttl}`). In reality, the `ttl` field in `ceph health detail --format json` is an absolute `utime_t` timestamp (e.g., `2024-01-15 14:30:00.000000`), not a relative duration. The code will still function (`.get()` defaults handle the absent-TTL case correctly), but the printed output would show an absolute timestamp rather than a relative duration.
- **`--sticky` flag not documented**: The `ceph health mute` command supports a `--sticky` flag that makes the mute persist even after the underlying condition resolves. Without `--sticky`, mutes auto-clear when the condition resolves or worsens (e.g., more OSDs go down). This is particularly relevant for the maintenance window pattern described in the post, where conditions may temporarily resolve and recur.
- **Mutes auto-clear on worsening conditions**: The post does not mention that most health mutes disappear if the extent of the alert gets worse (e.g., additional OSDs go down). This is documented Ceph behavior and is important to understand during maintenance windows.
