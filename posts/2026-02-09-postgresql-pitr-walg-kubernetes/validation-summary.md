# Validation Summary: How to Implement PostgreSQL Point-in-Time Recovery with WAL-G on Kubernetes

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- PostgreSQL 16
- PostgreSQL point-in-time recovery
- WAL-G
- Kubernetes StatefulSet, ConfigMap, Secret, CronJob, and Service resources
- Amazon S3 and AWS CLI
- PrometheusRule alerts

## Sources Consulted
- PostgreSQL 16 Continuous Archiving and Point-in-Time Recovery: https://www.postgresql.org/docs/16/continuous-archiving.html
- PostgreSQL 16 Write Ahead Log, Archive Recovery, and Recovery Target settings: https://www.postgresql.org/docs/16/runtime-config-wal.html
- PostgreSQL 16 system information functions: https://www.postgresql.org/docs/16/functions-info.html
- WAL-G PostgreSQL documentation: https://wal-g.readthedocs.io/PostgreSQL/
- WAL-G delete command documentation: https://wal-g.readthedocs.io/
- WAL-G GitHub releases: https://github.com/wal-g/wal-g/releases
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- AWS CLI S3 ls command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html
- AWS CLI environment variable documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- Prometheus community postgres_exporter repository: https://github.com/prometheus-community/postgres_exporter

## Issues Found
- The WAL-G install examples used the old v2.0.1 release and an asset name that is no longer current for the latest WAL-G release. Updated the examples to v3.0.8 and the current `wal-g-pg-20.04-amd64.tar.gz` asset name verified from the WAL-G GitHub releases.
- The Dockerfile left apt package lists behind after installing AWS CLI. Added cleanup to keep the image example correct and conventional.
- The PostgreSQL StatefulSet overrode the official `postgres` image entrypoint with `command`, which would skip the image's initialization behavior. Changed it to use `args` so the official entrypoint still runs while passing the custom config file option to PostgreSQL.
- The StatefulSet examples referenced `serviceName` values without defining the required governing headless Services. Added minimal headless Service resources to the existing YAML snippets.
- The backup CronJob mounted the live StatefulSet PVC and ran `wal-g backup-push` against the data directory from a second pod. Replaced that with WAL-G's remote backup mode by setting `PGHOST` and `PGUSER` and running `wal-g backup-push` without a data-directory argument.
- The backup retention comment said "older than 30 days", but `wal-g delete retain 30` keeps a count of backups, not backups by age. Changed the example and comment to `wal-g delete retain FULL 30 --confirm`.
- The recovery initContainer restored files as the container user without fixing ownership. Added `chown -R postgres:postgres /var/lib/postgresql/data` after `backup-fetch`.
- The recovery timestamp lacked an explicit time zone. Changed it to `2026-02-09 12:00:00+00`, matching PostgreSQL's recommendation to avoid ambiguous time zone abbreviations.
- The "Recovery to Latest State" example used `recovery_target = 'latest'`, but PostgreSQL only allows `recovery_target = 'immediate'`; recovering to the end of WAL is the default. Removed the invalid setting.
- The transaction ID example used deprecated `txid_current()`. Replaced it with `pg_current_xact_id()` for PostgreSQL 16.
- The Prometheus WAL archive lag alert used a metric name that does not match the common postgres_exporter stat_archiver collector. Updated it to `pg_stat_archiver_last_archive_age`.
- The `wal-g delete everything RETAIN 3 --confirm` example used invalid WAL-G syntax. Changed it to `wal-g delete everything --confirm` and adjusted the comment to describe the destructive behavior accurately.

## Review Notes
- The snippets are still illustrative and assume supporting resources such as the PostgreSQL credentials secret, S3 bucket, IAM permissions, and a configured Prometheus PostgreSQL exporter. Those operational prerequisites are outside the scope of this correction.
- The YAML snippets were parsed locally with PyYAML after edits.
