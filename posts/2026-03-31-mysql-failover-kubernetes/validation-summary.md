# Validation Summary: How to Handle MySQL Failover on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL InnoDB Cluster
- MySQL Group Replication
- MySQL Router
- Kubernetes (StatefulSet, liveness/readiness probes)
- Prometheus (alerting with mysqld_exporter metrics)
- Python (mysql-connector-python)

## Sources Consulted
- MySQL InnoDB Cluster documentation: https://dev.mysql.com/doc/mysql-shell/en/mysql-innodb-cluster.html
- MySQL Group Replication documentation: https://dev.mysql.com/doc/refman/8.0/en/group-replication.html
- MySQL Router configuration reference: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html
- prometheus/mysqld_exporter Group Replication collector: https://github.com/prometheus/mysqld_exporter
- Kubernetes probe configuration: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- mysql-connector-python API reference: https://dev.mysql.com/doc/connector-python/en/

## Issues Found

### 1. Incorrect Prometheus metric for Group Replication monitoring
- **What was wrong:** The Prometheus alert used `mysql_slave_status_master_server_id`, which is a metric from `SHOW SLAVE STATUS` (traditional replication). Since the entire article is about InnoDB Cluster with Group Replication, this metric is irrelevant — Group Replication does not use the traditional replication status interface.
- **What was changed:** Replaced the alert with `mysql_perf_schema_replication_group_members{member_state!="ONLINE"} > 0`, which uses the mysqld_exporter's Group Replication collector that scrapes `performance_schema.replication_group_members`. This detects when any GR member enters a non-ONLINE state (RECOVERING, ERROR, UNREACHABLE, OFFLINE), which correlates with failover events. Also updated the alert name, description text, and annotation to reflect the change.
- **Why:** Using the wrong metric family would result in an alert that never fires in a pure Group Replication setup, giving operators a false sense of monitoring coverage.

### 2. Retry logic used linear backoff, not exponential backoff
- **What was wrong:** The Python reconnection code used `time.sleep(delay * (attempt + 1))`, which produces delays of 2, 4, 6, 8, 10 seconds (linear). However, the Summary section describes the retry logic as "exponential backoff."
- **What was changed:** Changed to `time.sleep(delay * (2 ** attempt))`, which produces delays of 2, 4, 8, 16, 32 seconds (true exponential backoff), matching the Summary's description.
- **Why:** Exponential backoff is the recommended approach for reconnection during failover, and the code should match the description.

## Review Notes
- The Group Replication heartbeat timeout described as "default 5 seconds" is approximately correct — the suspicion timeout before a member is expelled defaults to 5 seconds (via `group_replication_member_expel_timeout` in MySQL 8.0.13+, with the default changed to 5 in MySQL 8.0.21).
- The MySQL Router `client_connect_timeout = 9` is set to the default value, making it redundant but not incorrect.
- The Kubernetes probe configuration is standard and correct. The liveness probe using `mysqladmin ping` and readiness probe using `SELECT 1` are common patterns for MySQL on Kubernetes.
- All kubectl commands use correct syntax and flags.
- The mysql-connector-python API usage is correct and current.
