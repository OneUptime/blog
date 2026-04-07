# Validation Summary: How to Track ceph_osd_commit_latency_ms Metric

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (OSD performance metrics)
- Prometheus (PromQL queries and alerting rules)
- Grafana (time series visualization)
- Kubernetes (kubectl commands, debug pods)
- BlueStore (WAL/DB device configuration)

## Sources Consulted
- Ceph official documentation on OSD performance counters: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph `osd perf` and `osd dump` command reference: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph admin socket / `ceph daemon` documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Rook CephCluster CRD storage configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Prometheus alerting rules format: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- PromQL `quantile()` aggregation function: https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators

## Issues Found

1. **Incorrect command: `ceph osd dump | grep -i latency`**
   - **What was wrong:** `ceph osd dump` outputs OSD map information (up/down/in/out status, weights, CRUSH data), not performance metrics. Grepping for "latency" in its output would return nothing.
   - **What was changed:** Replaced with `ceph osd perf | sort -k3 -rn | head -10` which shows OSD performance data (including commit and apply latency) sorted by commit latency descending, displaying the top 10 worst performers.
   - **Why:** `ceph osd perf` is the correct command for viewing OSD latency metrics from the CLI.

2. **Incorrect pod target for `ceph daemon` command**
   - **What was wrong:** The command `ceph daemon osd.0 ops` was run via `exec` into the `rook-ceph-tools` deployment. However, `ceph daemon` communicates via the OSD's admin socket (a Unix domain socket), which is only accessible from within the OSD pod itself, not from the tools pod.
   - **What was changed:** Replaced with a command that dynamically finds the correct OSD pod using label selector `ceph-osd-id=0` and execs into it, using `dump_ops_in_flight` (the correct admin socket command name).
   - **Why:** The admin socket is local to the OSD container. The `ops` subcommand doesn't exist; the correct command is `dump_ops_in_flight`.

## Review Notes
- The apply vs commit latency explanation is a simplification. With BlueStore (now the default), both commit and apply callbacks often fire at nearly the same time. The "apply = memory, commit = disk" distinction was more meaningful with the legacy FileStore backend. The explanation is acceptable for a high-level guide but readers should be aware the behavior differs between storage backends.
- The `quantile(0.95, ceph_osd_commit_latency_ms)` query computes the 95th percentile across OSD instances at a single point in time, not over a time window. The comment "Latency percentile approximation" is reasonable but readers should understand this is a cross-instance percentile, not a temporal one.
- The Grafana panel section uses a `javascript` code block for what is actually Grafana panel configuration pseudocode, not executable JavaScript. This is a minor stylistic choice that doesn't affect correctness.
