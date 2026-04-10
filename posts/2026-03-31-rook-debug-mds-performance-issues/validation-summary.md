# Validation Summary: How to Debug MDS Performance Issues in CephFS

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook-Ceph (Kubernetes operator for Ceph)
- CephFS Metadata Server (MDS)
- Kubernetes (kubectl, pod resources)
- Ceph CLI (ceph tell, ceph config set, ceph fs subvolumegroup)
- Prometheus / Grafana (alerting rules)

## Sources Consulted
- Rook CephFilesystem CRD Go types (`MetadataServerSpec` struct in `pkg/apis/ceph.rook.io/v1/types.go`) — confirmed `config` is not a valid field under `metadataServer`; valid fields include `activeCount`, `activeStandby`, `resources`, `placement`, `cacheMemoryLimitFactor`, etc.
- Ceph MGR Prometheus module source (`src/pybind/mgr/prometheus/module.py`) — confirmed LONGRUNAVG perf counters are exported with `_sum` and `_count` suffixes, not `_avgcount`.
- Ceph MDS perf counter documentation and `perf dump` output format for latency-type counters.
- Ceph configuration reference for `mds_op_complaint_time`, `debug_mds`, and `mds_cache_memory_limit`.
- Ceph `fs subvolumegroup pin` CLI reference for distributed pinning syntax.

## Issues Found

### 1. Invalid `config` field in CephFilesystem CRD YAML (Step 4)
**What was wrong:** The YAML included a `config` map under `spec.metadataServer` with `mds_cache_memory_limit: "8589934592"`. The Rook CephFilesystem CRD does not have a `config` field under `metadataServer` — this field would be silently ignored, and the MDS cache limit would not be applied.

**What was changed:** Removed the `config` section from the YAML and added a separate `ceph config set mds mds_cache_memory_limit 8589934592` command via the Rook toolbox to properly set the MDS cache memory limit through the Ceph config store.

**Why:** The `MetadataServerSpec` in Rook's API only supports fields like `activeCount`, `activeStandby`, `resources`, `placement`, `cacheMemoryLimitFactor`, etc. Arbitrary Ceph config options must be set via `ceph config set` or the CephCluster ConfigOverride.

### 2. Incorrect Prometheus metric suffix in alerting rule (Step 6)
**What was wrong:** The PromQL expression used `ceph_mds_server_req_create_latency_avgcount` as a metric name. Prometheus does not use `_avgcount` as a suffix.

**What was changed:** Changed `ceph_mds_server_req_create_latency_avgcount` to `ceph_mds_server_req_create_latency_count`.

**Why:** The Ceph MGR Prometheus module exports LONGRUNAVG perf counters with standard Prometheus `_sum` and `_count` suffixes. While the Ceph internal perf dump uses `avgcount`, the Prometheus export normalizes this to `_count` per Prometheus conventions.

## Review Notes
- The post could mention Rook's `cacheMemoryLimitFactor` field on the `MetadataServerSpec` as an alternative to setting `mds_cache_memory_limit` directly. This field automatically derives the cache limit from the pod's memory resource limits.
- Step 5 describes "pinning hot directories" but the command shown (`ceph fs subvolumegroup pin`) pins subvolume groups specifically, not arbitrary directories. For arbitrary directory pinning, `setfattr -n ceph.dir.pin.distributed -v 1 /path/to/dir` would be the approach. The command shown is correct for subvolume group pinning.
- The exact MDS perf counter names (e.g., `req_create_latency` vs `req_create`) may vary slightly between Ceph versions. The illustrative output format is reasonable.
- Setting `debug_mds` to level 5 is appropriate for debugging but should be noted as generating significant log volume — it should be lowered after investigation.
