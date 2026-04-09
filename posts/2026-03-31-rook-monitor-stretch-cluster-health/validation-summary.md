# Validation Summary: How to Monitor Stretch Cluster Health in Rook-Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (stretch cluster topology)
- Ceph CLI tools (`ceph health`, `ceph status`, `ceph mon stat`, `ceph quorum_status`, `ceph osd tree`, `ceph osd crush tree`, `ceph pg dump`, `ceph pg stat`)
- Kubernetes / kubectl
- Prometheus (metrics and alerting rules)
- PromQL

## Sources Consulted
- Ceph stretch mode documentation: https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Ceph MGR Prometheus module source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph MonCommands.h (for `ceph osd crush tree --show-shadow`): https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph MgrCommands.h (for `ceph pg dump summary`): https://github.com/ceph/ceph/blob/main/src/mgr/MgrCommands.h
- Ceph Prometheus alert rules: https://github.com/ceph/ceph/blob/main/monitoring/ceph-mixin/prometheus_alerts.yml
- Ceph nagios plugins (for `quorum_status` JSON schema): https://github.com/ceph/ceph-nagios-plugins/blob/master/src/check_ceph_mon

## Issues Found
No technical issues found.

## Review Notes
- The `--show-shadow` flag on `ceph osd crush tree` is framed as being specific to stretch cluster monitoring, but it actually shows device-class shadow hierarchies that exist in any cluster using device classes. The command and flag are correct; the context is slightly narrow but not inaccurate since stretch clusters do use this feature.
- The Prometheus query example assumes Prometheus is deployed as `deploy/prometheus` in the `monitoring` namespace. Actual deployment names vary by setup (e.g., kube-prometheus-stack uses different naming). This is acceptable for an illustrative example.
- All seven Prometheus metric names (`ceph_mon_quorum_status`, `ceph_osd_up`, `ceph_pg_total`, `ceph_pg_active`, `ceph_pg_degraded`, `ceph_cluster_total_bytes`, `ceph_cluster_total_used_bytes`) are confirmed in the Ceph MGR Prometheus module source code.
- The 5-monitor recommendation (2 per data site + 1 tiebreaker) matches official Ceph stretch mode documentation exactly.
- The `ceph quorum_status` JSON output does include a `quorum_names` array, and the Python one-liner correctly parses it.
