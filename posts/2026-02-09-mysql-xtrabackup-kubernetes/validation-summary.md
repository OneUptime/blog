# Validation Summary: How to Implement MySQL Backup Automation Using Percona XtraBackup on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 / Percona Server for MySQL 8.0
- Percona XtraBackup 8.0
- Kubernetes StatefulSet, CronJob, ConfigMap, Secret, and PersistentVolumeClaim
- Docker
- Bash
- AWS CLI / Amazon S3

## Sources Consulted
- Percona XtraBackup 8.0 documentation: https://docs.percona.com/percona-xtrabackup/8.0/
- Percona XtraBackup Docker image documentation: https://docs.percona.com/percona-xtrabackup/8.0/docker.html
- Percona XtraBackup APT installation documentation: https://docs.percona.com/percona-xtrabackup/8.0/apt-repo.html
- Percona XtraBackup full, compressed, and incremental backup documentation: https://docs.percona.com/percona-xtrabackup/8.0/create-full-backup.html, https://docs.percona.com/percona-xtrabackup/8.0/create-compressed-backup.html, https://docs.percona.com/percona-xtrabackup/8.0/create-incremental-backup.html
- Percona XtraBackup incremental prepare documentation: https://docs.percona.com/percona-xtrabackup/8.0/prepare-incremental-backup.html
- Percona Server for MySQL Docker documentation: https://docs.percona.com/percona-server/8.0/docker.html
- Docker Official Image documentation for Percona: https://hub.docker.com/_/percona
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The post described XtraBackup hot backups as non-locking for all table types and included MariaDB broadly. Updated the wording to specify MySQL-compatible 8.0 databases, non-blocking behavior for InnoDB/XtraDB workloads, and brief locks for non-InnoDB tables such as MyISAM.
- The point-in-time recovery claim implied the physical backup alone was sufficient. Updated the claim to clarify that PITR requires binary logs in addition to the XtraBackup restore.
- The MySQL container used the generic `percona:8.0` image and mounted configuration under `/etc/mysql/conf.d`. Updated the image to `percona/percona-server:8.0` and mounted custom configuration under `/etc/my.cnf.d`, matching Percona’s documented container path.
- The backup Dockerfile attempted to install XtraBackup with `apt-get` from a Percona server image. Replaced it with an Ubuntu-based image that configures the official Percona `pxb-80` APT repository and installs `percona-xtrabackup-80` plus compression and S3 utilities.
- The backup CronJobs did not mount the MySQL data directory, but XtraBackup is a physical backup tool and needs access to the data files. Added a read-only mount of the StatefulSet PVC claim `mysql-data-mysql-0` and passed `--datadir=/var/lib/mysql`.
- The incremental backup script always based incrementals on the latest full backup. Updated it to chain from the latest local full or incremental backup.
- The restore script prepared the full backup before applying incrementals, which would make later incremental backups unusable. Updated it to decompress backups, prepare the base with `--apply-log-only`, apply intermediate incrementals with `--apply-log-only`, and finalize on the last incremental.
- The restore script streamed a tarball into `/restore` without creating the directory first. Added `mkdir -p ${RESTORE_DIR}`.
- The backup PVC requested `ReadWriteMany` from a generic `standard` storage class, which is commonly unsupported. Changed it to `ReadWriteOnce` for this single-backup-job example and added `concurrencyPolicy: Forbid` to reduce overlap risk.

## Review Notes
`bash -n` passed for all Bash snippets extracted from the Markdown. `kubectl` and `shellcheck` were not installed in the local environment, so Kubernetes manifests were reviewed against official API documentation rather than validated with a local client. The CronJob approach still depends on storage and scheduling behavior that allows the backup pod to mount the MySQL data PVC while the MySQL pod is running; production Kubernetes MySQL deployments often handle this with a sidecar, backup replica, storage snapshots, or an operator-managed backup workflow.
