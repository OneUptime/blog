# Validation Summary: How to Enable Per-Image IO Statistics for RBD in Rook

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- RBD (RADOS Block Device)
- Ceph Manager Prometheus module
- Prometheus (metrics querying)
- Grafana (dashboard variables)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph Prometheus Module Documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Prometheus Module Source Code (MODULE_OPTIONS): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph Prometheus Module RST docs: https://github.com/ceph/ceph/blob/main/doc/mgr/prometheus.rst
- Ceph PR #25358 (original RBD stats via OSD dynamic perf counters)
- Ceph PR #25908 (changed bytes counters to COUNTER type)

## Issues Found
No technical issues found.

All verified claims:
- `mgr/prometheus/rbd_stats_pools` is the correct config option, confirmed in both docs and source code.
- `mgr/prometheus/rbd_stats_pools_refresh_interval` is correct with a default of 300 seconds (the blog sets it to 60, which is a valid custom value).
- `ceph config set mgr mgr/prometheus/rbd_stats_pools "replicapool"` uses the correct command syntax.
- Wildcard `*` for all pools is supported, confirmed in source code (`if pool_name == "*"`).
- All six metric names (`ceph_rbd_read_bytes`, `ceph_rbd_write_bytes`, `ceph_rbd_read_ops`, `ceph_rbd_write_ops`, `ceph_rbd_read_latency_sum`, `ceph_rbd_write_latency_sum`) are correct for current Ceph versions.
- The `ceph_rbd_` prefix is correct (internal `rbd_` path + `ceph_` prefix from the Prometheus export formatter).
- The `kubectl get pv` jsonpath for `.spec.csi.volumeAttributes.imageName` is correct for Ceph CSI RBD volumes.
- The Grafana `label_values(ceph_rbd_write_ops, image)` query syntax is correct.

## Review Notes
- The MGR restart step is a conservative recommendation. The Ceph Prometheus module implements `config_notify()` which can pick up config changes dynamically within one refresh cycle (up to the configured refresh interval). A restart guarantees immediate effect but may not be strictly necessary. The blog's recommendation is safe and not incorrect.
- The `kubectl rollout restart deployment -n rook-ceph -l app=rook-ceph-mgr` command uses label selection with `rollout restart`, which is supported in kubectl 1.23+. Given the 2026 publication date, this is fine.
- Per-image metrics also include labels `pool`, `namespace`, and `image` which the post correctly references when mapping to Kubernetes PVCs.
