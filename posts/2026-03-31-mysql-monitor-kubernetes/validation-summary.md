# Validation Summary: How to Monitor MySQL on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Kubernetes
- Prometheus (mysqld-exporter v0.15.1)
- Prometheus Operator (ServiceMonitor CRD)
- Grafana

## Sources Consulted
- mysqld-exporter GitHub repository and documentation (https://github.com/prometheus/mysqld_exporter)
- MySQL documentation on InnoDB buffer pool status variables (https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html)
- MySQL documentation on GRANT statement and required privileges (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- Kubernetes documentation on liveness and readiness probes (https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- Prometheus Operator documentation on ServiceMonitor CRD (https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor)
- Go MySQL DSN format documentation (https://github.com/go-sql-driver/mysql#dsn-data-source-name)

## Issues Found
1. **InnoDB buffer pool hit ratio formula was inverted.** The original formula `mysql_global_status_innodb_buffer_pool_reads / mysql_global_status_innodb_buffer_pool_read_requests` calculates the miss ratio, not the hit ratio. `innodb_buffer_pool_reads` counts logical reads that could not be satisfied from the buffer pool and required a disk read, while `innodb_buffer_pool_read_requests` is the total number of read requests. Fixed to `1 - (mysql_global_status_innodb_buffer_pool_reads / mysql_global_status_innodb_buffer_pool_read_requests)`.

## Review Notes
- The `DATA_SOURCE_NAME` environment variable was deprecated in mysqld-exporter v0.15.0 in favor of `--mysqld.address` and `--mysqld.username` flags (with `MYSQLD_EXPORTER_PASSWORD` for the password). It still works for backward compatibility in v0.15.1, but a future version of this post could migrate to the newer configuration approach.
- The `--collect.slave_status` flag and `mysql_slave_status_seconds_behind_master` metric use legacy "slave" terminology. MySQL 8.0.22+ introduced "replica" terminology, but the exporter retains the older names for backward compatibility. This is not an error but worth noting.
- The SQL user grants (PROCESS, REPLICATION CLIENT, SELECT) are correct and match the mysqld-exporter documentation recommendations.
- All Kubernetes manifests (Deployment, Service, ServiceMonitor) are syntactically valid and follow standard patterns.
- Liveness and readiness probes use standard MySQL health check patterns (`mysqladmin ping` and `SELECT 1`).
