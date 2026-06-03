# Validation Summary: How to Implement Storage Data Migration Between StorageClasses on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes CSI VolumeSnapshots and VolumeSnapshotClasses
- kubectl
- rsync
- Velero
- PostgreSQL streaming replication
- KubeVirt CDI / custom migration Jobs

## Sources Consulted
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Volume Snapshot Classes documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Velero v1.18 install CLI documentation: https://velero.io/docs/v1.18/velero-install/
- Velero v1.18 backup reference: https://velero.io/docs/v1.18/backup-reference/
- Velero v1.18 restore reference: https://velero.io/docs/v1.18/restore-reference/
- PostgreSQL pg_basebackup documentation: https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL log-shipping standby documentation: https://www.postgresql.org/docs/current/warm-standby.html
- Docker Official Image documentation for postgres: https://hub.docker.com/_/postgres

## Issues Found
- Replaced `kubectl set volume`, which is not part of the current upstream `kubectl set` subcommands, with a supported strategic `kubectl patch` command that updates the Deployment volume's PVC claim name.
- Clarified that snapshot-based migration provides crash-consistent snapshots unless the application is quiesced or integrated with backup hooks. The original wording implied application consistency while writes continued.
- Updated the Velero CLI and AWS plugin examples from older v1.12-era versions to Velero v1.18 and the matching AWS plugin version shown in current Velero upgrade/install documentation.
- Removed `--restore-volumes=true` from the Velero restore command because it is not a current `velero restore create` option in the v1.18 restore reference.
- Replaced the PostgreSQL replica example's unsupported `POSTGRES_MASTER_SERVICE_HOST` environment variable with a `pg_basebackup -R` based standby initialization flow, which aligns with PostgreSQL streaming replication setup.
- Updated the PostgreSQL promotion command to pass the replica data directory explicitly with `pg_ctl -D`.
- Fixed the custom migration Job so it reads `SOURCE_PVC`, `TARGET_STORAGE_CLASS`, and `NAMESPACE` from environment variables instead of unset positional shell arguments.
- Fixed the custom migration Job's generated migration pod by mounting the source PVC read-only, setting `restartPolicy: Never`, and waiting for the pod phase to become `Succeeded` instead of only waiting for readiness.
- Corrected validation commands to use the actual migration pod name `storage-migrator` instead of the undefined `migration-pod`.

## Review Notes
- Local `kubectl` was not installed in the review environment, so CLI behavior was checked against official Kubernetes and Velero documentation rather than local command help.
- YAML snippets in the post were parsed successfully with PyYAML after the corrections.
- The PostgreSQL example remains a simplified replication illustration; production PostgreSQL migrations should usually use an operator, managed service, or tested database-specific runbook with credentials stored in Kubernetes Secrets.
