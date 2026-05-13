# Validation Summary: How to Deploy MySQL InnoDB Cluster Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository resources
- MySQL Operator for Kubernetes
- MySQL InnoDB Cluster
- MySQL Router
- MySQL Group Replication
- MySQL Shell
- Kubernetes Secrets, Namespaces, Services, and PVCs

## Sources Consulted
- MySQL Operator for Kubernetes Manual: https://dev.mysql.com/doc/mysql-operator/en/
- MySQL Operator Helm installation documentation: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-installation-helm.html
- MySQL InnoDBCluster manifest documentation: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-innodbcluster-common.html
- MySQL Operator custom resource properties: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-properties.html
- MySQL InnoDB Cluster service documentation: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-innodbcluster-service.html
- MySQL Operator backup documentation: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-backups.html
- MySQL Operator official Helm repository index: https://mysql.github.io/mysql-operator/index.yaml
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- MySQL Reference Manual, InnoDB redo log configuration: https://dev.mysql.com/doc/refman/9.4/en/optimizing-innodb-logging.html

## Issues Found
- The HelmRelease pinned `mysql-operator` chart version `2.2.1`, which is not present in the current official MySQL Operator Helm repository index. Updated it to `2.2.8`, the current 2.2 chart version in the official index.
- The operator resource requests and limits were under a top-level `resources` key that the current chart does not use. Moved them under `deployment.resources`, matching the chart values schema.
- The examples created objects in the `databases` namespace but only created the `mysql-operator` namespace. Added a `databases` Namespace manifest to the namespace example.
- The InnoDBCluster example used MySQL `8.0.36`, while the current 2.2 operator chart tracks MySQL `9.7.0`. Updated the example version and rolling-upgrade text to avoid pinning an outdated patch series.
- The MySQL configuration used deprecated `innodb_log_file_size`. Replaced it with `innodb_redo_log_capacity`, which is the current redo log sizing variable.
- The S3 backup profile included `region` under `spec.backupSchedules[].backupProfile.dumpInstance.storage.s3`, but the MySQL Operator CRD supports `bucketName`, `config`, `endpoint`, `prefix`, and `profile` there. Removed the unsupported field.

## Review Notes
The remaining snippets align with the documented MySQL Operator CRD fields, Flux `HelmRelease` and `Kustomization` API shapes, and Kubernetes `kubectl port-forward` syntax. The S3 credentials Secret referenced by `config: backup-s3-credentials` still needs to be created by the reader with the provider-specific settings required by their environment.
