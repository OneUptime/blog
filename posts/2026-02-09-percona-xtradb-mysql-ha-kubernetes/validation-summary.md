# Validation Summary: How to Set Up Percona XtraDB Cluster for MySQL High Availability on Kubernetes

## Status
validated

## Post Type
Tutorial / Kubernetes deployment guide

## Technologies Covered
- Percona Operator for MySQL based on Percona XtraDB Cluster
- Percona XtraDB Cluster
- Galera replication
- MySQL / Percona Server for MySQL
- Kubernetes and kubectl
- ProxySQL
- Percona XtraBackup
- Percona Monitoring and Management (PMM)
- Helm
- Amazon S3-compatible backup storage

## Sources Consulted
- Percona Operator for MySQL PXC kubectl installation: https://docs.percona.com/percona-operator-for-mysql/pxc/kubectl.html
- Percona Operator for MySQL PXC custom resource options: https://docs.percona.com/percona-operator-for-mysql/pxc/operator.html
- Percona Operator for MySQL PXC 1.19.1 release notes and certified images: https://docs.percona.com/percona-operator-for-mysql/pxc/ReleaseNotes/Kubernetes-Operator-for-PXC-RN1.19.1.html
- Percona Operator upstream `deploy/cr.yaml` for v1.19.1: https://raw.githubusercontent.com/percona/percona-xtradb-cluster-operator/v1.19.1/deploy/cr.yaml
- Percona Operator upstream `deploy/secrets.yaml` for v1.19.1: https://raw.githubusercontent.com/percona/percona-xtradb-cluster-operator/v1.19.1/deploy/secrets.yaml
- Percona Operator on-demand backup documentation: https://docs.percona.com/percona-operator-for-mysql/pxc/backups-ondemand.html
- Percona Operator restore documentation: https://docs.percona.com/percona-operator-for-mysql/pxc/backups-restore.html
- Percona Operator restore CR reference: https://docs.percona.com/percona-operator-for-mysql/pxc/restore-cr.html
- Percona Operator ProxySQL documentation: https://docs.percona.com/percona-operator-for-mysql/pxc/proxysql-conf.html
- Percona Operator PMM monitoring documentation: https://docs.percona.com/percona-operator-for-mysql/pxc/monitoring.html
- PMM Server Helm installation documentation: https://docs.percona.com/percona-monitoring-and-management/3/install-pmm/install-pmm-server/deployment-options/helm/index.html
- Percona XtraDB Cluster architecture documentation: https://docs.percona.com/percona-operator-for-mysql/pxc/architecture.html
- Percona XtraDB Cluster certification documentation: https://docs.percona.com/percona-xtradb-cluster/8.0/certification.html
- Percona XtraDB Cluster wsrep variable reference: https://docs.percona.com/percona-xtradb-cluster/8.4/wsrep-system-index.html
- Percona Server for MySQL 8.0 removed features: https://docs.percona.com/percona-server/8.0/upgrade-changes-removed.html
- MySQL 8.4 InnoDB redo log configuration: https://dev.mysql.com/doc/refman/8.4/en/innodb-init-startup-configuration.html

## Issues Found
- The operator and image versions were outdated. Updated the tutorial from Operator 1.13.0-era examples to current 1.19.1 examples, including certified PXC, ProxySQL, PMM Client, and XtraBackup images.
- The install command cloned the default branch and applied the bundle without the current documented server-side apply flow. Pinned the clone to `v1.19.1` and changed the bundle apply command to `kubectl apply --server-side`.
- The PXC affinity example used raw Kubernetes pod anti-affinity under the operator CR field. Replaced it with the operator-supported `affinity.antiAffinityTopologyKey`.
- The MySQL configuration used removed or deprecated options. Removed `query_cache_type` and `query_cache_size`, replaced deprecated `wsrep_slave_threads` with `wsrep_applier_threads`, and replaced `innodb_log_file_size` with `innodb_redo_log_capacity`.
- The ProxySQL example used old image and port assumptions. Updated the image, disabled HAProxy when using ProxySQL, changed the ProxySQL listener and port-forward examples to port 3306, and used the operator-managed `proxyadmin` secret for admin access.
- The secrets example included an obsolete `clustercheck` key and missed current keys. Added `replication` and `pmmservertoken`.
- The scheduled backup example used deprecated `keep` retention and an old backup image. Updated it to `retention` and the current XtraBackup image.
- The restore workflow incorrectly scaled PXC to zero before restore. Removed that step and used the documented restore CR flow.
- The PMM Helm chart example referenced the old `percona/pmm-server` chart and HTTP service assumptions. Updated it to the current `percona/pmm` chart with a Kubernetes Secret and HTTPS port-forwarding.
- The manual ProxySQL read/write split SQL could be overwritten by the operator and did not match current operator behavior. Replaced it with the operator-managed ProxySQL scheduler configuration.
- Several claims overstated "zero downtime" and "zero data loss" guarantees. Reworded them to reflect virtually synchronous replication, primary component behavior, and strong data loss protection.

## Review Notes
The article is technically valid as a tutorial after correction, but it remains a condensed example. A production deployment should still validate storage classes, PMM token creation, S3 IAM permissions, TLS/cert-manager behavior, resource sizing, and backup restore procedures in a staging cluster before use.
