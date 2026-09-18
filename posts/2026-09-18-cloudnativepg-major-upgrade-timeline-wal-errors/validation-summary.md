# Validation Summary: Recover CloudNativePG Major Upgrade Cutovers with Timeline or WAL Errors

## Status

validated

## Post Type

Technical troubleshooting and recovery guide with Kubernetes CLI examples.

## Technologies Covered

- CloudNativePG 1.30 and its kubectl plugin
- PostgreSQL major upgrades, pg_upgrade link mode, extensions, and optimizer statistics
- PostgreSQL WAL archiving, timelines, physical backups, and point-in-time recovery
- Kubernetes Jobs, Pods, persistent volume claims, labels, and events
- Barman Cloud CNPG-I plugin and ObjectStore configuration

## Sources Consulted

- CloudNativePG 1.30 PostgreSQL upgrade documentation (official release-branch source): https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.30/docs/src/postgres_upgrades.md
- CloudNativePG 1.30 kubectl plugin documentation: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.30/docs/src/kubectl-plugin.md
- CloudNativePG 1.30 Cluster API definitions: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.30/api/v1/cluster_types.go
- CloudNativePG 1.30 labels and annotations: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.30/docs/src/labels_annotations.md
- CloudNativePG 1.30 backup documentation: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.30/docs/src/backup.md
- CloudNativePG 1.30 release notes: https://cloudnative-pg.io/docs/1.30/release_notes/v1.30/
- Barman Cloud plugin usage and configuration: https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/
- PostgreSQL 18 pg_upgrade: https://www.postgresql.org/docs/18/pgupgrade.html
- PostgreSQL 18 continuous archiving and PITR: https://www.postgresql.org/docs/18/continuous-archiving.html
- Kubernetes kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl describe: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes Jobs and their Pod labels: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found

1. The diagnostic prose instructed readers to describe the upgrade Pod, but the example only described the Job. Job output does not provide the individual Pod's full container state and Pod events. Added `kubectl describe pods -n database -l batch.kubernetes.io/job-name=app-db-1-major-upgrade` while retaining the Job description. Kubernetes documents this label for selecting a Job's Pods, and kubectl describe supports label selectors. This makes the example useful for the stated image-pull, scheduling, and volume-attachment checks.

## Review Notes

- Confirmed the offline upgrade flow, Job naming, replica recreation, same-distribution requirement, and automatic failed-Job cleanup after reverting the requested major version against the official 1.30 upgrade source.
- Verified the Cluster status field, cluster label, kubectl resource syntax, namespace and output flags, event sorting, Job log selection, all-container logging, and cnpg status verbosity.
- Confirmed the archive-generation boundary and the requirement for a new backup after upgrading. The post correctly separates failed conversion from failures after the upgraded server starts and preserves the backup-based recovery boundary for linked data files.
- Barman's serverName belongs in the Cluster plugin parameters; the similarly named ObjectStore field must remain empty. The post correctly directs readers to the plugin-specific configuration. The consulted 1.30 backup source describes the in-tree integration as deprecated.
- PostgreSQL 18 transfers most, but not all, optimizer statistics. The post's version-dependent wording is appropriate and does not incorrectly claim that statistics are always discarded.
- The linked PostgreSQL and plugin pages were accessible and relevant. The rendered CloudNativePG upgrade URL could not be retrieved by the browsing tool; its content was checked using the official release-1.30 documentation source instead. This retrieval limitation alone does not establish that the link is broken.
- This was a documentation and command-syntax review. No live Kubernetes cluster, database upgrade, backup, or restore was executed. Example resource names must be replaced with the actual deployment names, as the post instructs, and kubectl cnpg requires the plugin to be installed.
