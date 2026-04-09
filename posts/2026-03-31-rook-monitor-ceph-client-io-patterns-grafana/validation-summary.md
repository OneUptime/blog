# Validation Summary: How to Monitor Ceph Client IO Patterns in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Grafana (visualization and dashboarding)
- Prometheus / PromQL (metrics querying)

## Sources Consulted
- Ceph documentation on OSD performance counters and the Prometheus manager module (https://docs.ceph.com/en/latest/mgr/prometheus/)
- Ceph source code metric definitions for OSD counters (`ceph_osd_op_r`, `ceph_osd_op_w`, `ceph_osd_op_r_out_bytes`, `ceph_osd_op_w_in_bytes`, `ceph_osd_op_r_latency_sum/count`, `ceph_osd_op_w_latency_sum/count`, `ceph_osd_op`)
- Prometheus documentation on `rate()` and summary/histogram metric patterns (https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- Ceph configuration reference for `rbd_cache` and `osd_op_threads` (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Grafana documentation on Time series, Bar chart, and Heatmap panel types

## Issues Found
No technical issues found.

## Review Notes
- The `osd_op_threads` parameter mentioned in the introduction is the older name. In newer Ceph versions (Nautilus+), the OSD threading model uses sharded parameters like `osd_op_num_threads_per_shard` and `osd_op_num_shards`. The post uses it illustratively rather than as a configuration directive, so this is acceptable.
- The average IO size and latency calculations involve division, which produces NaN in PromQL when the denominator is zero (no operations). Grafana handles this gracefully by showing gaps in the graph, so no special handling is needed, but users should be aware of this behavior.
- The IO size heuristics (< 64 KB = random, > 512 KB = sequential) are reasonable generalizations for storage tuning purposes, though real-world workloads can have exceptions (e.g., large random I/O or small sequential I/O).
