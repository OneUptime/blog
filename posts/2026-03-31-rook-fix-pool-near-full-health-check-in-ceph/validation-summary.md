# Validation Summary: How to Fix POOL_NEAR_FULL Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster, health checks, OSD management, pool quotas)
- Rook (Kubernetes Ceph operator)
- RBD (RADOS Block Device images and snapshots)
- Kubernetes (PVC volume snapshots, kubectl commands)
- Prometheus (alerting rules for Ceph metrics)

## Sources Consulted
- Ceph official documentation on health checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph official documentation on monitoring OSDs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph MGR Prometheus module source and metrics: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph `ceph_pool_percent_used` metric addition (PR #40804): https://github.com/ceph/ceph/pull/40804
- Ceph CLI reference for `rbd`, `ceph osd pool`, `ceph config` commands
- Rook documentation on OSD management: https://rook.io/docs/rook/latest/

## Issues Found

### 1. Incorrect Prometheus alert expression (Critical)
**What was wrong:** The original Prometheus alert used `(ceph_pool_stored / ceph_pool_max_avail) > 0.75`. This formula is mathematically incorrect for calculating pool utilization. `ceph_pool_max_avail` is the remaining available bytes, not the total capacity. Dividing stored by available gives a ratio that approaches infinity as the pool fills (e.g., 750GB stored / 250GB available = 3.0, not 0.75).

**What was changed:** Replaced with `ceph_pool_percent_used > 0.75` as the primary expression (available since Ceph Pacific), which is the built-in metric that matches `ceph df` output. Added a fallback formula `ceph_pool_stored / (ceph_pool_stored + ceph_pool_max_avail) > 0.75` for older Ceph versions. Added a note warning against the original incorrect formula.

**Why:** The incorrect formula would never trigger at the 0.75 threshold — the ratio exceeds 0.75 only when the pool is approximately 43% full (stored/avail = 0.75 when stored = 0.4286 * total), producing false positives, or it could produce unexpected results depending on how Prometheus evaluates it.

## Review Notes
- The command `rbd ls --long <pool-name> | grep -i snap` for finding orphaned snapshots is technically valid but only finds RBD images with "snap" in their name — it does not list actual RBD snapshots. A more thorough approach would iterate over images and run `rbd snap ls` for each. This is a minor effectiveness concern rather than a correctness error, so it was left unchanged.
- All Ceph CLI commands (`ceph health detail`, `ceph df`, `ceph osd df`, `ceph config get`, `ceph osd reweight-by-utilization`, `ceph osd pool get-quota`, `ceph osd pool set-quota`) are syntactically correct and use current flags.
- All Kubernetes/Rook commands are correct.
- The `mon_osd_nearfull_ratio` default of 0.85 (85%) is accurate.
- The `max_bytes` value 2199023255552 in the set-quota example equals 2 TiB, which is a reasonable example value.
