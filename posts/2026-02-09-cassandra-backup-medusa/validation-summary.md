# Validation Summary: Using Medusa for Apache Cassandra Backups on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Cassandra
- Medusa for Apache Cassandra
- K8ssandra Operator
- Kubernetes custom resources
- kubectl
- Object storage backends including S3, Google Cloud Storage, Azure Blob Storage, and S3-compatible storage

## Sources Consulted
- K8ssandra Operator backup and restore documentation: https://docs.k8ssandra.io/tasks/backup-restore/
- K8ssandra Medusa component documentation: https://docs.k8ssandra.io/components/medusa/
- K8ssandra Operator CRD reference: https://docs.k8ssandra.io/reference/crd/releases/k8ssandra-operator-releases/k8ssandra-operator-crds-1.1/
- Medusa for Apache Cassandra README: https://github.com/thelastpickle/cassandra-medusa
- Medusa usage documentation: https://github.com/thelastpickle/cassandra-medusa/blob/master/docs/Usage.md
- Medusa backup documentation: https://github.com/thelastpickle/cassandra-medusa/blob/master/docs/Performing-backups.md
- Medusa configuration documentation: https://github.com/thelastpickle/cassandra-medusa/blob/master/docs/Configuration.md

## Issues Found
- The backup trigger example used `kind: MedusaBackup` with `spec.type`. K8ssandra Operator documents `MedusaBackupJob` as the resource that triggers a backup, and the field is `backupType`. Updated the example, status command, and status output.
- The scheduled backup example used `type: differential`. Updated it to `backupType: differential` to match the `MedusaBackupSchedule` CRD.
- The post described differential backups as only uploading changed SSTables. Medusa documentation states that all backups copy only new SSTables from nodes, while differential backups differ by storing references in the backup catalog. Updated the explanation.
- The Medusa CLI verification command used `medusa verify backup --backup-name=...`. The documented command is `medusa verify --backup-name=...`. Updated the command.
- The K8ssandraCluster example pinned an old Medusa container image tag. Removed the explicit image override so the operator can use its default image unless the reader has a specific reason to override it.
- The monitoring section claimed Medusa exposes a Prometheus `/metrics` endpoint and showed an unsupported `medusa_backup_status` alert. Replaced it with Kubernetes resource status checks and the documented `report-last-backup --push-metrics` CLI option for configured monitoring providers.
- The conclusion still referred to Prometheus as the default backup health monitoring path. Updated it to reference Kubernetes resource status or configured metrics.

## Review Notes
The guide is technically relevant and useful after correction. The examples are still version-sensitive because K8ssandra Operator CRDs can evolve; readers should verify manifests against the CRD reference for the exact operator version installed in their cluster.
