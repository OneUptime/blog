# Validation Summary: Deploying ProxySQL for MySQL Connection Pooling on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ProxySQL
- MySQL
- Kubernetes Deployments, Services, Secrets, and probes
- Prometheus Operator ServiceMonitor
- MySQL Group Replication

## Sources Consulted
- ProxySQL configuration file documentation: https://proxysql.com/documentation/configuration-file/
- ProxySQL Docker image documentation: https://hub.docker.com/r/proxysql/proxysql
- ProxySQL MySQL tables documentation: https://proxysql.com/documentation/main-runtime/mysql-tables/
- ProxySQL MySQL stats tables documentation: https://proxysql.com/documentation/the-admin-schemas/stats/stats-mysql/
- ProxySQL multiplexing documentation: https://proxysql.com/documentation/multiplexing/
- ProxySQL query cache documentation: https://proxysql.com/documentation/query-cache/
- ProxySQL Prometheus exporter documentation: https://proxysql.com/documentation/prometheus-exporter/
- ProxySQL Group Replication documentation: https://proxysql.com/documentation/group-replication-configuration/
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- MySQL 8.0 GRANT statement documentation: https://dev.mysql.com/doc/refman/8.0/en/grant.html

## Issues Found
- The readiness probe used the `mysql` client inside the `proxysql/proxysql:2.6.3` container, but the official ProxySQL image documentation states that the package does not contain the MySQL client. Changed the readiness probe to a TCP check against the admin port and updated the explanatory text.
- The verification command used `kubectl exec` into the ProxySQL container and ran `mysql`, which has the same missing-client problem. Changed it to launch a temporary `mysql:8.0` client pod and connect through the ProxySQL Service.
- The `stats_mysql_connection_pool` query used non-existent column names for the stats table. Changed `hostgroup_id`, `hostname`, and `port` to the documented `hostgroup`, `srv_host`, and `srv_port` columns.
- The ServiceMonitor example selected Services labeled `app: proxysql`, but the Service did not define that label and did not expose a port named `metrics`. Added the Service label and a `metrics` Service port for ProxySQL's built-in Prometheus exporter on port 6070.
- The monitoring section recommended a third-party exporter sidecar even though the configuration already enabled ProxySQL's built-in Prometheus exporter. Replaced the sidecar snippet with text that uses the built-in exporter exposed on port 6070.

## Review Notes
- The article's use of a ConfigMap containing placeholder credentials is acceptable as an illustrative bootstrap example only because the following section instructs production users to inject values from Kubernetes Secrets. A real manifest should avoid committing usable passwords in the ConfigMap.
- The read/write splitting rules are intentionally simple. Production deployments should account for application-specific transaction behavior, session state, replication lag, and read-after-write consistency requirements.
