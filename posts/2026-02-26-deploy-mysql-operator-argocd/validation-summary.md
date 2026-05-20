# Validation Summary: How to Deploy MySQL Operator with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- MySQL Operator for Kubernetes
- MySQL InnoDB Cluster
- MySQL Router
- External Secrets Operator
- Helm
- S3-compatible backup storage

## Sources Consulted
- MySQL Operator for Kubernetes Manual: https://dev.mysql.com/doc/mysql-operator/en/
- MySQL Operator Helm installation docs: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-installation-helm.html
- MySQL Operator InnoDBCluster manifest docs: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-innodbcluster-common.html
- MySQL Operator custom resource properties: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-properties.html
- MySQL Operator backup docs: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-backups.html
- MySQL Operator Helm chart index: https://mysql.github.io/mysql-operator/index.yaml
- Argo CD custom resource health docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD automated sync docs: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync options docs: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync waves docs: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- External Secrets Operator ExternalSecret API docs: https://external-secrets.io/v0.10.5/api/externalsecret/

## Issues Found
- The Argo CD Application used MySQL Operator chart version `2.2.1`, which is no longer present in the current official Helm chart index. Updated it to `2.2.8`, the current 2.2 chart version shown by the official repository.
- The operator Helm values placed CPU and memory settings under top-level `resources`, but the current chart reads them from `deployment.resources`. Moved the resource requests and limits under `deployment.resources`.
- The backup section described scheduled backups but showed a `MySQLBackup` object, which creates a one-off backup rather than a schedule. Clarified the wording and renamed the example to a manual backup while leaving the scheduled backup configuration in `backupSchedules`.
- The Argo CD Lua health check could return an empty health object when `.status` was absent. Added a default `Progressing` status and message before checking the MySQL Operator status fields.

## Review Notes
The InnoDBCluster fields, ExternalSecret shape, Argo CD Application sync settings, custom health-check key format, sync-wave annotations, and MySQL Router service host/port examples are consistent with the official documentation reviewed. The MySQL version examples remain pinned to the author's chosen 8.4.x series; operators should still test upgrades with MySQL Shell `checkForServerUpgrade()` as recommended by Oracle.
