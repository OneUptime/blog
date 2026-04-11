# Validation Summary: How to Scale MySQL on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB Cluster, Group Replication)
- Kubernetes (StatefulSet, HorizontalPodAutoscaler, kubectl)
- MySQL Shell (Admin API)
- MySQL Router
- ProxySQL (read/write splitting, query routing)

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes HorizontalPodAutoscaler v2 API: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/
- kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- MySQL Shell Admin API (dba.getCluster, cluster.addInstance): https://dev.mysql.com/doc/mysql-shell/8.0/en/admin-api-userguide.html
- ProxySQL query rules documentation: https://proxysql.com/documentation/proxysql-query-rules/
- ProxySQL mysql_servers configuration: https://proxysql.com/documentation/main-runtime/#mysql_servers

## Issues Found
1. **ProxySQL query rule ordering bug (critical)**: The original `mysql_query_rules` had `rule_id=1` matching `^SELECT` with `apply=1`, which would catch ALL SELECT queries — including `SELECT ... FOR UPDATE` — and route them to read replicas (hostgroup 20) before the more specific `rule_id=2` for `SELECT ... FOR UPDATE` could ever be evaluated. This would cause locking reads to be sent to replicas instead of the primary, a data consistency issue. Fixed by swapping the rule order so `SELECT ... FOR UPDATE` is matched first (rule_id=1) and the general `SELECT` catch-all is rule_id=2. Also changed the second rule from `match_digest` to `match_pattern` for consistency, since both rules now use `match_pattern`.

## Review Notes
- The `mysqlsh --password=secret` example uses a plaintext password on the command line. This is standard for tutorial examples but would not be recommended in production. Not changed since this is a common convention in educational content.
- The ProxySQL image tag `proxysql/proxysql:2.6` is a valid current version.
- The HPA manifest correctly uses the `autoscaling/v2` API (stable since Kubernetes 1.23).
- The StatefulSet rolling update behavior described ("restart one pod at a time") is accurate for the default `RollingUpdate` strategy.
