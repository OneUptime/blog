# Validation Summary: How to Visualize Ceph Network Performance in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- Grafana (dashboard visualization)
- Prometheus (metrics collection)
- PromQL (query language)
- Kubernetes (ConfigMap provisioning)
- Node Exporter (NIC-level metrics)

## Sources Consulted
- Ceph Prometheus Module Documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph OSD perf counters source (osd_perf_counters.cc): https://github.com/ceph/ceph/blob/main/src/osd/osd_perf_counters.cc
- Ceph Monitor source (Monitor.cc): https://github.com/ceph/ceph/blob/main/src/mon/Monitor.cc
- Ceph Monitoring Overview (doc/monitoring/index.rst): https://github.com/ceph/ceph/blob/main/doc/monitoring/index.rst
- Real Prometheus metrics scrape from Ceph cluster (leseb gist): https://gist.github.com/leseb/6d3f92ed69e5fe1053894dacc93263b7
- IBM Ceph OSD Metrics documentation: https://www.ibm.com/docs/en/storage-ceph/6.1.0?topic=counters-ceph-osd-metrics
- Red Hat Ceph Performance Counters (RHCS 7): https://docs.redhat.com/en/documentation/red_hat_ceph_storage/7/html/administration_guide/ceph-performance-counters
- DigitalOcean ceph_exporter METRICS.md: https://github.com/digitalocean/ceph_exporter/blob/main/METRICS.md

## Issues Found

### Issue 1: Non-existent metric `ceph_mon_client_bytes_sent`
- **What was wrong:** The metrics table listed `ceph_mon_client_bytes_sent` described as "Monitor bytes sent to clients." This metric does not exist in Ceph's Prometheus module. Ceph monitors do not expose a bytes-sent counter via Prometheus. The monitor perf counters include session-related metrics (`num_sessions`, `session_add`, `session_rm`, `session_trim`) but no client byte counters.
- **What was changed:** Replaced `ceph_mon_client_bytes_sent` with `ceph_mon_num_sessions` ("Number of active monitor client sessions"), which is a real Ceph monitor metric that is relevant to network monitoring (tracking client connectivity to monitors).
- **Why:** Using a fabricated metric name would cause confusion when readers try to query it and get no results.

### Issue 2: Misrepresented metric `ceph_osd_op_r_latency_count` as timeout tracker
- **What was wrong:** The "Network Error Rate Panel" section described `rate(ceph_osd_op_r_latency_count[5m])` as "OSD operations that timed out." This is incorrect. `ceph_osd_op_r_latency_count` is the count component of the read operation latency counter — it increments with every read operation and is used alongside `ceph_osd_op_r_latency_sum` to compute average latency. It does not track timeouts or errors.
- **What was changed:** Updated the description text and PromQL comment to accurately describe the metric as tracking the OSD read operation rate, noting that drops in this rate can indicate network connectivity issues. Changed "Track network-related OSD timeouts and errors" to "Monitor OSD read operation rates and network errors" and the comment from "OSD operations that timed out" to "OSD read operation rate (drops may indicate network issues)."
- **Why:** The original description would mislead readers into thinking the metric tracks error conditions when it actually tracks normal operation counts.

## Review Notes
- In Ceph Reef (18.x) and newer, OSD perf counter metrics (`ceph_osd_op_r_out_bytes`, `ceph_osd_op_w_in_bytes`, etc.) are exported by the `ceph-exporter` daemon rather than the mgr prometheus module. Rook deploys ceph-exporter automatically, so these metrics remain available, but readers running non-Rook Ceph Reef+ clusters should ensure ceph-exporter is enabled.
- The 10 GbE bandwidth example states 500 MB/s as 50% capacity. The theoretical 50% of 10 Gbps is ~625 MB/s, but 500 MB/s is a reasonable practical estimate accounting for protocol overhead. Since it is presented as an example ("e.g."), this was left as-is.
- Ceph does not expose a dedicated "timed out operations" Prometheus metric. For timeout/slow-op detection, readers should consider alerting on high average latency (`rate(ceph_osd_op_r_latency_sum) / rate(ceph_osd_op_r_latency_count)`) or monitoring the `SLOW_OPS` health check via `ceph_health_detail`.
- All PromQL syntax is correct: `rate()` usage, range vector selectors `[5m]`, label matchers `{namespace="rook-ceph"}`, and the latency computation pattern `rate(sum)/rate(count)` are all valid.
- The `kubectl` commands for ConfigMap creation and Grafana sidecar labeling (`grafana_dashboard=1`) are correct.
