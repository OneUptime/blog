# Validation Summary: How to Deploy MySQL Operator on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- MySQL 8.0.x
- MySQL Operator for Kubernetes (Oracle)
- MySQL InnoDB Cluster (group replication)
- MySQL Router
- Kubernetes (StatefulSets, Services, Secrets, CronJobs)
- Helm v3
- talosctl

## Sources Consulted
- [MySQL Operator for Kubernetes GitHub repository](https://github.com/mysql/mysql-operator)
- [MySQL Operator Manual — Installation via Helm](https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-installation-helm.html)
- [MySQL Operator Manual — InnoDB Cluster](https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-innodbcluster.html)
- [MySQL Operator Manual — InnoDB Cluster Service](https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-innodbcluster-service.html)
- [MySQL Operator Manual — Handling MySQL Backups](https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-backups.html)
- [mysql-operator router_objects.py source](https://raw.githubusercontent.com/mysql/mysql-operator/trunk/mysqloperator/controller/innodbcluster/router_objects.py)
- [mysql-innodbcluster Helm values.yaml](https://github.com/mysql/mysql-operator/blob/trunk/helm/mysql-innodbcluster/values.yaml)

## Issues Found
No technical issues found.

Key items verified against official sources:
- `apiVersion: mysql.oracle.com/v2` and `kind: InnoDBCluster` / `kind: MySQLBackup` are correct.
- Helm repo URL `https://mysql.github.io/mysql-operator/` and chart `mysql-operator/mysql-operator` are correct.
- InnoDBCluster spec fields used (`instances`, `router.instances`, `secretName`, `tlsUseSelfSigned`, `version`, `datadirVolumeClaimTemplate`, `mycnf`) are valid per the CRD.
- Secret format with `rootUser`, `rootHost`, `rootPassword` literals matches official examples.
- MySQL Router ports `6446` (R/W classic) and `6447` (R/O classic) are exposed on the cluster service via `mysql-alternate` and `mysql-ro` ports; using `production-mysql:6446` / `:6447` from an application works.
- Pod selector label `mysql.oracle.com/cluster=<name>` and Router selector label `component=mysqlrouter` are correct.
- MySQLBackup spec with `clusterName` and `backupProfileName` matches the documented CRD; the referenced profile must be defined in the InnoDBCluster's `spec.backupProfiles`.
- MySQL 8.0.36 is a real, supported MySQL Server image.
- `binlog_expire_logs_seconds` and `group_replication_communication_max_message_size` are valid MySQL 8.0 system variables.
- Talos `machine.sysctls` syntax with string values is the documented format.

## Review Notes
- The `mycnf` example includes `innodb_log_file_size=256M`. This option was deprecated in MySQL 8.0.30 in favor of `innodb_redo_log_capacity`; it still works in 8.0.36 but will emit a deprecation warning. Worth noting in a future revision but not incorrect for the version used.
- The `Configuring Backups` section shows a MySQLBackup that references `backupProfileName: full-backup`, but the post does not show how to define that profile under `spec.backupProfiles` in the InnoDBCluster. Readers will need to add a matching profile for the backup to succeed.
- The backup CronJob uses a `serviceAccountName: backup-sa` without showing the ServiceAccount/Role/RoleBinding required to allow it to create `MySQLBackup` resources. This is implementation detail rather than a technical inaccuracy.
- The `Monitoring` section references `kubectl get servicemonitor` and `kubectl port-forward svc/production-mysql 3306:3306` but does not show how to enable the metrics exporter on the InnoDBCluster (`spec.metrics`). Accurate as far as it goes, just light on detail.
- `bitnami/kubectl:latest` is used in the backup CronJob. Bitnami changed its image distribution model in 2025; the image still resolves at time of review but may require migrating to `bitnamilegacy/kubectl` or another maintained image in the future.
- The `mysql`/`mysqlsh` invocations pass the root password inline on the kubectl command, which is convenient for a tutorial but exposes the password to the host process list. Acceptable in a tutorial context.
