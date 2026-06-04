# Validation Summary: Deploy MySQL Using Percona XtraDB Cluster Operator for Multi-Master Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Percona XtraDB Cluster
- Percona Operator for MySQL based on Percona XtraDB Cluster
- Kubernetes
- Helm
- HAProxy
- ProxySQL
- Percona XtraBackup
- PrometheusRule

## Sources Consulted
- Percona Operator for MySQL Custom Resource options: https://docs.percona.com/percona-operator-for-mysql/pxc/operator.html
- Percona Operator for MySQL HAProxy documentation: https://docs.percona.com/percona-operator-for-mysql/pxc/haproxy-conf.html
- Percona Operator for MySQL crash recovery documentation: https://docs.percona.com/percona-operator-for-mysql/pxc/recovery.html
- Percona Operator for MySQL v1.19.1 sample Custom Resource: https://raw.githubusercontent.com/percona/percona-xtradb-cluster-operator/v1.19.1/deploy/cr.yaml
- Percona Operator for MySQL v1.19.1 sample secrets: https://raw.githubusercontent.com/percona/percona-xtradb-cluster-operator/v1.19.1/deploy/secrets.yaml
- Percona Operator for MySQL v1.19.1 CRD schema: https://raw.githubusercontent.com/percona/percona-xtradb-cluster-operator/v1.19.1/deploy/crd.yaml
- Percona XtraDB Cluster monitoring documentation: https://docs.percona.com/percona-xtradb-cluster/8.4/monitoring.html
- Prometheus mysqld_exporter repository: https://github.com/prometheus/mysqld_exporter

## Issues Found
- The post used Percona Operator v1.14.0 and older component images. Updated examples to current v1.19.1-era images from the official sample CR: `percona/percona-xtradb-cluster:8.4.7-7.1`, `percona/haproxy:2.8.17`, `percona/proxysql2:2.7.3-1.2`, and `percona/percona-xtrabackup:8.4.0-5.1`.
- The kubectl operator install applied `deploy/bundle.yaml` without creating or targeting the `pxc-operator` namespace, but then verified pods in that namespace. Added namespace creation and `-n pxc-operator`.
- The cluster secret example omitted the required `replication` key and included old/non-required keys as required. Updated it to match the current official secret shape.
- The article overstated multi-master write scaling and "zero data loss" guarantees. Clarified that all nodes can accept writes, but multi-master writes do not provide linear write scaling and conflicting writes can be aborted; single-node failure wording now refers to committed transactions.
- The HAProxy section incorrectly described the main HAProxy service as distributing all connections across cluster nodes. Updated it to reflect Percona's documented behavior: the primary HAProxy service routes read/write traffic to one available writer node, while the replicas service uses round-robin for reads and should not be used for writes.
- The ProxySQL example did not disable HAProxy. Added `haproxy.enabled: false` to avoid enabling both proxy modes in the same alternative example.
- The crash recovery section described `autoRecovery` as setting a bootstrap node. Changed it to enabling automatic crash recovery, matching Percona documentation.
- The production S3 backup example included `serverSideEncryption.kmsKeyID`, which was not present in the checked PXC operator CRD schema. Removed the unsupported field.
- The best practices and conclusion claimed write bottleneck elimination and focused on replication lag. Reworded to emphasize availability, read capacity, replication queues, and flow control.

## Review Notes
The PrometheusRule examples assume metrics exported with mysqld_exporter-compatible names. In a production deployment, the post could be improved later by showing the PMM or exporter configuration that creates those metrics, but the alert expressions are plausible for a mysqld_exporter-style setup.
