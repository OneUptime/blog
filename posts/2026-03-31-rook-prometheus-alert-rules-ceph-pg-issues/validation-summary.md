# Validation Summary: How to Create Prometheus Alert Rules for Ceph PG Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (Placement Groups, PG states, OSD management)
- Prometheus (alerting rules, PromQL expressions, offset modifier)
- Rook (Ceph operator for Kubernetes, rook-ceph-tools deployment)
- Kubernetes (kubectl, PrometheusRule CRD via Prometheus Operator)
- Prometheus Operator (monitoring.coreos.com/v1 API)

## Sources Consulted
- Ceph official documentation on Placement Group states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on PG repair commands: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph MGR Prometheus module metric naming conventions: https://docs.ceph.com/en/latest/mgr/prometheus/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- Rook Ceph toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **Incorrect description of "undersized" PG state in CephPGsUndersized alert annotation**: The description said "Fewer active OSDs than the pool's min_size setting". This is incorrect. Undersized PGs have fewer copies than the pool's `size` parameter (the target replication factor), not `min_size`. The `min_size` parameter is the minimum number of replicas required for the PG to continue serving I/O. Changed to "Fewer active OSDs than the pool's size (replication factor) setting".

2. **Incorrect comment on `ceph pg force-recovery` command**: The comment said "Force re-peer a PG" but `ceph pg force-recovery` prioritizes recovery of a specified PG, it does not force re-peering. Changed comment to "Prioritize recovery of a PG".

## Review Notes
- The PG metric names (`ceph_pg_active`, `ceph_pg_degraded`, etc.) follow the ceph-mgr prometheus module naming convention and are correct.
- The Prometheus alerting rule YAML syntax is correct throughout, including proper use of `{{ $value }}` in annotation templates.
- The `offset` modifier usage in the PG count drop alert is valid PromQL.
- The PrometheusRule CRD uses the correct `monitoring.coreos.com/v1` API version for the Prometheus Operator.
- The `ceph pg dump_stuck` command without arguments will show PGs stuck in various states; while the comment "See all non-clean PGs" is a slight simplification, it is acceptable for a quick-reference context.
- The warning and info alert YAML fragments are shown as continuations from the main rule group, which is a standard blog presentation pattern. Users will need to combine them into a single YAML file for deployment.
