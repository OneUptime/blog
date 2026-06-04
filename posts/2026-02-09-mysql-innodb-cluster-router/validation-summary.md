# Validation Summary: How to Configure MySQL InnoDB Cluster on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL InnoDB Cluster
- MySQL Group Replication
- MySQL Shell AdminAPI
- MySQL Router
- Kubernetes StatefulSet, Service, Secret, ConfigMap, Deployment, CronJob, and PersistentVolumeClaim
- Python MySQL Connector
- Prometheus mysqld_exporter
- PrometheusRule

## Sources Consulted
- MySQL 8.0 Reference Manual: Group Replication requirements: https://dev.mysql.com/doc/refman/8.0/en/group-replication-requirements.html
- MySQL 8.0 Reference Manual: Configuring an instance for Group Replication: https://dev.mysql.com/doc/refman/8.0/en/group-replication-configuring-instances.html
- MySQL Shell 8.0: Creating an InnoDB Cluster: https://dev.mysql.com/doc/mysql-shell/8.0/en/create-cluster.html
- MySQL Shell 8.0: Adding instances to an InnoDB Cluster: https://dev.mysql.com/doc/mysql-shell/8.0/en/add-instances-cluster.html
- MySQL Shell 8.0: Deploying MySQL Router: https://dev.mysql.com/doc/mysql-shell/8.0/en/admin-api-deploy-router.html
- MySQL Router 8.0: Installing MySQL Router with Docker: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-installation-docker.html
- MySQL Docker deployment environment variables: https://dev.mysql.com/doc/refman/8.4/en/docker-mysql-more-topics.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Prometheus mysqld_exporter README: https://github.com/prometheus/mysqld_exporter

## Issues Found
- Removed deprecated or unnecessary MySQL 8.0 Group Replication options from the sample config: `master_info_repository`, `relay_log_info_repository`, `transaction_write_set_extraction`, and `binlog_checksum=NONE`. Updated `log_slave_updates` to `log_replica_updates` for current MySQL 8.0 terminology.
- Fixed the StatefulSet init script so it only rewrites `group_replication_local_address`. The original global `sed` replacement also changed the seed list and could remove `mysql-0` from other pods' seed configuration.
- Added `MYSQL_ROOT_HOST=%` because the Docker MySQL image creates `root@localhost` by default, while the tutorial connects as root from other pods and through MySQL Router.
- Added namespace creation before using `-n database`, and changed the MySQL Shell pod command so the pod remains available for later `kubectl exec` commands.
- Added `dba.configureInstance()` calls before creating and extending the InnoDB Cluster, matching the AdminAPI setup flow.
- Removed the unused hand-written MySQL Router ConfigMap and changed the Router deployment to use the official container bootstrap environment variables. Updated the Router image to Oracle's documented `container-registry.oracle.com/mysql/community-router:8.0` image and corrected X Protocol ports to `64460` and `64470`.
- Replaced the invalid failover watch command. In `kubectl exec`, arguments after `--` are passed to the container command, so the original trailing `--wait` would be passed to `mysql` rather than `kubectl`.
- Added the missing `import mysql.connector` to the read/write split Python example.
- Changed the backup CronJob to write to a PersistentVolumeClaim instead of an `emptyDir`, because `emptyDir` data is removed with the backup pod.
- Replaced the Prometheus exporter configuration. `DATA_SOURCE_NAME` is no longer supported by current `mysqld_exporter`; the post now mounts a `.my.cnf` file and passes `--mysqld.address` and `--config.my-cnf`.
- Added exporter user creation and enabled the Group Replication performance schema collectors used by the monitoring example.
- Replaced the obsolete/nonmatching replication lag alert metric with a Group Replication queue metric from the `replication_group_member_stats` collector.
- Renamed the replication monitoring text to "Monitor replication group status" because the query shows member state and role, not replication lag.

## Review Notes
- The tutorial remains a manual Kubernetes deployment. For production use, readers should also consider the official MySQL Operator for Kubernetes, TLS, non-root application users, PodDisruptionBudgets, readiness probes, and backup upload/off-cluster retention.
