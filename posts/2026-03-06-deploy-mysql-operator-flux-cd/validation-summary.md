# Validation Summary: How to Deploy MySQL Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and Flux HelmRelease
- MySQL Operator for Kubernetes
- MySQL InnoDB Cluster
- MySQL Router
- Kubernetes CronJob
- S3 backup configuration

## Sources Consulted
- MySQL Operator for Kubernetes manual: https://dev.mysql.com/doc/mysql-operator/en/
- MySQL Operator Helm installation docs: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-installation-helm.html
- MySQL Operator InnoDBCluster Helm docs: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-innodbcluster-simple-helm.html
- MySQL Operator backup docs: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-backups.html
- MySQL Operator custom resource properties: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-properties.html
- MySQL Operator chart repository index: https://mysql.github.io/mysql-operator/index.yaml
- MySQL Operator Helm chart templates and CRDs from the official chart package: https://mysql.github.io/mysql-operator/mysql-operator-2.1.11.tgz
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The repository structure omitted `service.yaml` even though the guide creates and includes that file later. Added `service.yaml` to the tree.
- The HelmRelease used top-level `resources` and `replicas` values with chart version `2.1.x`. The official `mysql-operator` 2.1 chart does not expose those values, so they would be ignored. Removed the unsupported values and kept the supported `image.pullPolicy` override.
- The application credentials Secret used `rootUser`, `rootHost`, and `rootPassword` keys even though it was not the operator root credential Secret. Changed it to generic `username` and `password` keys for application workloads.
- The InnoDBCluster manifest used `router.resources`, but the CRD exposes Router pod customization under `router.podSpec`. Moved the Router resource requests and limits under `router.podSpec.resources`.
- The MySQLBackup examples used `backupProfile.name` inside inline backup profiles. The MySQLBackup CRD uses `backupProfileName` for named profiles and `backupProfile` for unnamed inline specifications. Removed the invalid inline `name` fields and updated the comment.
- The custom Service selector omitted the `tier: mysql` label shown in the official operator-created service selector. Added the label to make the selector match the documented Router pod labels more precisely.

## Review Notes
- The MySQL Operator chart repository currently also publishes newer `2.2.x` charts, but the post pins `2.1.x`, which is consistent with the MySQL 8.4 series used in the examples.
- The operator normally creates a Service named after the InnoDBCluster, so the custom `mysql-cluster-primary` Service is optional. It is technically valid as a convenience Service.
- Local `helm`, `kubectl`, and `flux` binaries were not installed in the review environment, so CLI behavior was checked against official documentation and chart/CRD source rather than local command output.
