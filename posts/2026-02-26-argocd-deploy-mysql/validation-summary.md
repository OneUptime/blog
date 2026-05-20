# Validation Summary: How to Deploy MySQL with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications, sync waves, sync options, and resource hooks
- Kubernetes Deployments, StatefulSets, Services, PersistentVolumeClaims, Jobs, and CronJobs
- MySQL 8.0 container configuration, backups, and replication concepts
- Bitnami MySQL Helm chart
- Oracle MySQL Operator for Kubernetes and InnoDBCluster
- Prometheus mysqld_exporter
- AWS S3 backup uploads

## Sources Consulted
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Persistent Volumes and access modes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes command and args environment variable expansion: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- MySQL Docker Official Image documentation: https://hub.docker.com/_/mysql/
- Bitnami MySQL chart 9.15.0 parameters: https://artifacthub.io/packages/helm/bitnami/mysql/9.15.0
- MySQL Operator for Kubernetes manual: https://dev.mysql.com/doc/mysql-operator/en/
- MySQL Operator Helm installation: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-installation-helm.html
- MySQL InnoDBCluster manifest options: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-innodbcluster-common.html
- MySQL 8.0 replication setup: https://dev.mysql.com/doc/mysql/8.0/en/replication-setup-replicas.html
- MySQL 8.0 CHANGE REPLICATION SOURCE TO: https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 START REPLICA: https://dev.mysql.com/doc/refman/8.0/en/start-replica.html
- MySQL 8.0 mysqldump: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- Prometheus mysqld_exporter documentation: https://github.com/prometheus/mysqld_exporter
- Prometheus mysqld_exporter 0.15.0 release notes: https://github.com/prometheus/mysqld_exporter/releases

## Issues Found
- The standalone MySQL backup job connected as root from a separate Pod, but the MySQL image only creates remote root access when `MYSQL_ROOT_HOST` is set during initialization. Added `MYSQL_ROOT_HOST: "%"` to the Secret.
- The Bitnami MySQL chart example configured `secondary.replicaCount` but omitted `architecture: replication`, so the chart would remain in standalone mode. Added `architecture: replication` and a replication password.
- The manual StatefulSet section implied that per-pod server IDs and read-only settings were a complete replication setup. Clarified that replicas still need `CHANGE REPLICATION SOURCE TO` and `START REPLICA`, and added relay log/read-only settings for replica Pods.
- The backup CronJob used the official `mysql:8.0` image while running `aws s3 cp`; that image does not include the AWS CLI. Changed the example to a purpose-built backup image that includes both the MySQL client and AWS CLI.
- The Prometheus exporter example used `DATA_SOURCE_NAME` with `prom/mysqld-exporter:v0.15.1`, but that environment variable was removed in v0.15.0. Updated the Deployment to use `--mysqld.address`, `--mysqld.username`, and `MYSQLD_EXPORTER_PASSWORD`.

## Review Notes
- The post uses older pinned versions for the Bitnami MySQL chart and MySQL Operator chart. They are plausible pinned examples, but future maintenance should periodically review chart availability and supported Kubernetes/MySQL versions.
- The examples still use placeholder passwords and simplified Secrets. Production deployments should use a secret manager or sealed/encrypted secrets workflow.
