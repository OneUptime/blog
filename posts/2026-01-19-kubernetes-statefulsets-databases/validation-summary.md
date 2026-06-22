# Validation Summary: How to Set Up StatefulSets for Databases in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StatefulSets, Services, PersistentVolumeClaims, StorageClasses, PodDisruptionBudgets, CronJobs, Secrets, and ConfigMaps
- PostgreSQL 16, `pg_isready`, `pg_basebackup`, and `pg_dump`
- MySQL 8.4 LTS, GTID-related configuration, and XtraBackup-style physical cloning
- MongoDB 7.0 replica sets, keyfile authentication, and `mongosh`
- AWS EBS CSI-backed Kubernetes storage

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes replicated MySQL StatefulSet example: https://kubernetes.io/docs/tasks/run-application/run-replicated-stateful-application/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- MongoDB replica set keyfile authentication documentation: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/
- MongoDB Docker Official Image documentation: https://hub.docker.com/_/mongo
- MongoDB Docker entrypoint source: https://github.com/docker-library/mongo/blob/master/docker-entrypoint.sh
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres
- PostgreSQL `pg_isready` documentation: https://www.postgresql.org/docs/current/app-pg-isready.html
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- MySQL 8.0 release notes / EOL notice: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/
- MySQL GTID replication documentation: https://dev.mysql.com/doc/mysql-replication-excerpt/8.0/en/replication-gtids-howto.html
- Percona XtraBackup streaming backup documentation: https://docs.percona.com/percona-xtrabackup/8.0/take-streaming-backup.html

## Issues Found
- The introduction claimed the examples showed "production-ready" database deployments. Changed this to "common database patterns" because the examples still require operator-grade failover, replication bootstrap, backup, and security hardening.
- The PostgreSQL replication example cloned into `/var/lib/postgresql/data` while `PGDATA` was set to `/var/lib/postgresql/data/pgdata`. Updated the emptiness check and `pg_basebackup -D` target to the configured `PGDATA` path.
- The PostgreSQL replication snippet referenced `replicator-password` but the Secret did not define it. Added the missing Secret key and noted that the replication role and `pg_hba.conf` entries are required.
- The MySQL example used `mysql:8.0`, which is EOL as of April 2026. Updated it to MySQL 8.4 LTS.
- The MySQL XtraBackup containers used the old Kubernetes sample image `gcr.io/google-samples/xtrabackup:1.0`, which is not appropriate for modern MySQL 8.4 examples. Replaced it with a clearly version-compatible custom-image placeholder and documented the required tools.
- The MySQL read service was labeled as "read replicas" but selected all MySQL pods. Renamed it to a service for all MySQL pods and clarified that the primary-only service depends on external failover/controller label management.
- The MongoDB StatefulSet overrode the container entrypoint with `command: mongod`, which prevents the official image's initialization logic from creating the root user from `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD`. Changed it to `args` so the official entrypoint still runs.
- The MongoDB probes and replica-set initialization command used unauthenticated `mongosh` commands even though authentication/keyfile access was enabled. Updated them to authenticate against the `admin` database using the configured Secret-backed environment variables.
- The MongoDB keyfile Secret was mounted directly with restrictive permissions that could make it unreadable by the `mongodb` user. Added an init container that copies the keyfile into an `emptyDir`, assigns it to UID/GID 999, and applies `chmod 400`, matching MongoDB keyfile permission requirements.
- The MongoDB examples referenced Secrets that were not shown. Added minimal Secret examples for the keyfile and root credentials.
- The StorageClass used deprecated/removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Updated it to the AWS EBS CSI provisioner `ebs.csi.aws.com`.
- The backup CronJob used `postgres:16` while running `aws s3 cp`; the official PostgreSQL image does not include the AWS CLI. Changed the example to use a custom image that includes both `pg_dump` and the storage CLI.
- The conclusion said to "Always use StatefulSets" for databases. Changed this to "Use StatefulSets or database operators" to avoid excluding the common operator-based production pattern.

## Review Notes
- The YAML snippets were parsed successfully with PyYAML after edits: 15 YAML blocks parsed.
- The bash snippet passed `bash -n` after edits.
- The PostgreSQL and MySQL replication sections remain starting-point examples, not complete production HA implementations. The post now explicitly calls out the missing failover, bootstrap, and access-control work.
