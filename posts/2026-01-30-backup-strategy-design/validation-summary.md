# Validation Summary: How to Build Backup Strategy Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Backup strategy design
- PostgreSQL backups, WAL archiving, and point-in-time recovery
- MySQL backups and binary log coordinates
- rsync incremental backups
- Kubernetes and Velero backups
- etcd snapshots
- cron scheduling
- Bash scripting
- Python monitoring scripts
- AWS CLI S3 commands
- OneUptime heartbeat monitoring

## Sources Consulted
- PostgreSQL documentation: Continuous Archiving and Point-in-Time Recovery (PITR) - https://www.postgresql.org/docs/current/continuous-archiving.html
- MySQL 8.4 Reference Manual: mysqldump - https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- Velero documentation: Schedule API Type - https://velero.io/docs/main/api-types/schedule/
- Velero documentation: Backup API Type - https://velero.io/docs/main/api-types/backup/
- Linux crontab(5) manual - https://man7.org/linux/man-pages/man5/crontab.5.html
- Kubernetes documentation: Operating etcd clusters for Kubernetes - https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- etcd documentation: Disaster recovery - https://etcd.io/docs/v3.5/op-guide/recovery/
- etcdutl README - https://github.com/etcd-io/etcd/blob/main/etcdutl/README.md
- AWS CLI documentation: aws s3 cp - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- rsync manual page - https://linux.die.net/man/1/rsync
- Python documentation and Python 3.12 deprecation guidance for timezone-aware UTC datetimes - https://docs.python.org/3/library/datetime.html

## Issues Found
- The PostgreSQL section implied that the `pg_dump` script itself implemented WAL-based point-in-time recovery. Changed the wording to describe it as a logical backup and clarified that PITR requires WAL archiving paired with physical base backups such as `pg_basebackup`.
- The MySQL section claimed a full/incremental strategy with binary log archiving, but the script only made a logical dump and rotated logs. Updated the description and script comments, added `--source-data=2` to record binary log coordinates, and made pipeline failures detectable with `set -euo pipefail` and an `if mysqldump | gzip` check.
- The MySQL backup script did not create `BACKUP_DIR` before writing the dump. Added `mkdir -p "$BACKUP_DIR"`.
- The `mysqldump --single-transaction` explanation was too broad. Clarified that it provides consistency for transactional tables such as InnoDB.
- The rsync incremental backup script failed on a first run because `--link-dest` pointed at a non-existent `latest` symlink. Added conditional `--link-dest` handling and ensured the backup base directory exists.
- The etcd verification command used deprecated `etcdctl snapshot status`. Replaced it with the documented `etcdutl --write-out=table snapshot status`.
- The `/etc/cron.d` example omitted the required user field. Added `root` to each cron entry.
- The Python monitoring example used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)`.
- The restore test script reused the same test database name for all runs on a day and exited successfully after restore failure. Added a timestamp with seconds, failure exit status, and cleanup via `trap`.
- Several shell scripts with monitoring calls would have stopped if a heartbeat request failed after adding strict shell mode. Made heartbeat `curl` calls non-fatal where appropriate.
- The recovery runbook template used nested triple backticks inside a triple-backtick markdown block and closed inner fences as ```` ```bash ````. Switched the outer block to a four-backtick fence and fixed inner fence closures.

## Review Notes
The examples are intentionally generic and still require environment-specific credentials, permissions, retention policy, encryption settings, and restore runbooks before production use. Velero field names shown are valid in current documentation, but volume snapshot behavior depends on the installed Velero version and configured snapshot or file-system backup plugins.
