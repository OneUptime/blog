# Validation Summary: Deploying MySQL Operator with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- MySQL Operator for Kubernetes
- MySQL InnoDB Cluster
- MySQL Router
- Helm
- Kubernetes manifests and kubectl
- TLS certificates and Kubernetes Secrets
- MySQLBackup and backupSchedules
- Prometheus / mysqld_exporter monitoring

## Sources Consulted
- Oracle MySQL Operator for Kubernetes manual: https://dev.mysql.com/doc/mysql-operator/en/
- Oracle MySQL Operator Helm installation documentation: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-innodbcluster-simple-helm.html
- Oracle MySQL Operator backup documentation: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-backups.html
- Oracle MySQL Operator custom resource properties: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-properties.html
- MySQL Operator GitHub repository and CRD definitions: https://github.com/mysql/mysql-operator
- MySQL Community Server downloads/version information: https://dev.mysql.com/downloads/mysql/
- prometheus/mysqld_exporter README and release information: https://github.com/prometheus/mysqld_exporter

## Issues Found
- The Helm values file used non-existent `operator.image`, top-level `resources`, and `watchedNamespaces` fields. Updated the example to use the current chart's `image`, `deployment.resources`, and `deployment.namespaces` values.
- The operator image tag and MySQL server versions were outdated for a 2026 guide. Updated the operator tag to `9.7.0-2.2.8` and the InnoDBCluster examples to MySQL `9.7.0`.
- The InnoDBCluster TLS field used `tlsServerCertAndKeySecretName`, which is not a valid CRD field. Changed it to `tlsSecretName`.
- The CA Secret example created `ca.crt`, but the operator expects `ca.pem` in the CA Secret. Updated the `kubectl create secret` command accordingly.
- The router configuration used `routerOptions`, which is not a valid CRD field. Changed it to `routingOptions`.
- The MySQLBackup example placed storage directly under `spec.storage`, but the CRD expects `spec.backupProfile.dumpInstance.storage` or a named backup profile. Updated the example.
- The scheduled backup CronJob example would not work as written because the `mysql` image does not include `kubectl` or `aws`, and it bypassed the operator's backup scheduling model. Replaced it with the operator-supported `backupProfiles` and `backupSchedules` configuration.
- The clone restore example used an incomplete donor address. Updated it to include the root user and the operator-managed `-instances` service DNS name.
- The monitoring section manually added an exporter sidecar even though the operator provides a `metrics` spec. Replaced it with the supported `spec.metrics` configuration and updated mysqld_exporter to `v0.19.0`.
- The replication alert used a classic replication metric that does not fit InnoDB Cluster group replication. Updated it to a group replication apply-queue metric and enabled the corresponding exporter collectors.
- The MySQL Shell troubleshooting command was not valid CLI syntax. Replaced it with a `mysqlsh --js -e "dba.getCluster().status()"` invocation.
- The router troubleshooting command assumed a router StatefulSet-style pod name. Replaced it with a label-based pod lookup.

## Review Notes
- The post is now technically aligned with the current MySQL Operator CRDs and Helm chart structure. Production deployments still need environment-specific choices for storage classes, RBAC, object-storage credentials, TLS SANs, and Prometheus scrape configuration.
