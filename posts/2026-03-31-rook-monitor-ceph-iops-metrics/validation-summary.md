# Validation Summary: How to Monitor Ceph IOPS Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Prometheus (metrics and alerting)
- Grafana (dashboards)
- PromQL (Prometheus query language)
- FIO (Flexible I/O tester)
- Kubernetes (container orchestration)
- Prometheus Operator (PrometheusRule CRD)

## Sources Consulted
- Ceph Prometheus Module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Prometheus `rate()` function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- Prometheus Operator API reference (PrometheusRule): https://prometheus-operator.dev/docs/api-reference/api/
- FIO documentation: https://fio.readthedocs.io/en/latest/
- Ceph CLI reference (`ceph osd pool stats`): https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found
No technical issues found.

## Review Notes
- The PromQL query code block uses a `bash` language tag. While `promql` would be more semantically accurate, this is a stylistic choice and does not affect correctness.
- The alert threshold values (50k cluster write IOPS, 10k per-pool IOPS) are reasonable example defaults but would need tuning for specific cluster sizes and workloads.
- The `ceph_pool_rd` and `ceph_pool_wr` metrics expose a `pool_id` numeric label. Users may want to join with pool name metadata for more readable alert messages, but the current approach is technically correct.
