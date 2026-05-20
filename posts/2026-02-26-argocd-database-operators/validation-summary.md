# Validation Summary: How to Deploy Database Operators with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications, Helm sources, sync options, ignore differences, and custom health checks
- Kubernetes operators and custom resources
- CloudNativePG for PostgreSQL
- MySQL Operator for Kubernetes and InnoDBCluster
- MongoDB Community Kubernetes Operator
- OT-CONTAINER-KIT Redis Operator
- Kubernetes storage, resources, affinity, and StatefulSet-backed database workloads

## Sources Consulted
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/helm/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- CloudNativePG API reference and samples: https://cloudnative-pg.io/docs/devel/cloudnative-pg.v1/
- CloudNativePG backup on object stores documentation: https://cloudnative-pg.io/documentation/1.24/backup_barmanobjectstore/
- CloudNativePG Helm chart values and metadata: https://github.com/cloudnative-pg/charts
- MySQL Operator for Kubernetes manual: https://dev.mysql.com/doc/mysql-operator/en/
- MySQL Operator InnoDBCluster documentation: https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-innodbcluster-common.html
- MongoDB Helm Charts repository documentation: https://mongodb.github.io/helm-charts/
- MongoDB Community Operator sample and CRD schema: https://github.com/mongodb/mongodb-kubernetes-operator
- OT-CONTAINER-KIT Redis Operator documentation and CRD schema: https://ot-container-kit.github.io/redis-operator/ and https://github.com/OT-CONTAINER-KIT/redis-operator

## Issues Found
- The post described example database custom resources as `PostgresCluster` and `MySQLCluster`. CloudNativePG uses `Cluster`, and MySQL Operator uses `InnoDBCluster`, so the wording was corrected.
- The architecture diagram labeled the backup output as `Backup CronJob`. CloudNativePG exposes `Backup` and `ScheduledBackup` resources, and operators may not model scheduled backups as user-facing CronJobs, so the diagram was changed to `Backup or ScheduledBackup Resource`.
- The operator upgrade snippet used `upgradeStrategy: "rolling"` for the CloudNativePG Helm chart. The chart value is `updateStrategy`, matching the Kubernetes Deployment strategy shape, so the snippet was corrected to `updateStrategy.type: RollingUpdate`.

## Review Notes
- The pinned chart and database image versions are examples and are not current as of 2026-05-20. They are syntactically valid, but production users should check operator release notes before applying them.
- CloudNativePG's `barmanObjectStore` backup configuration is valid for the older chart version shown, but newer CloudNativePG releases have been moving toward the Barman Cloud plugin. Future updates to this post should revisit the backup example if the chart target is updated.
- The Redis exporter image uses `latest`; this is operationally risky for reproducibility, but it is not a schema error.
