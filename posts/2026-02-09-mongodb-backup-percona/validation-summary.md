# Validation Summary: How to Implement MongoDB Backup and Restore Using Percona Backup for MongoDB

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Percona Backup for MongoDB
- Percona Server for MongoDB
- MongoDB replica sets
- Kubernetes StatefulSets and CronJobs
- AWS S3, Azure Blob Storage, Google Cloud Storage, and filesystem backup storage
- Bash scripting
- Docker

## Sources Consulted
- Percona Backup for MongoDB documentation: https://docs.percona.com/percona-backup-mongodb/
- PBM command reference: https://docs.percona.com/percona-backup-mongodb/reference/pbm-commands.html
- PBM authentication setup: https://docs.percona.com/percona-backup-mongodb/install/configure-authentication.html
- PBM cluster configuration: https://docs.percona.com/percona-backup-mongodb/reference/config.html
- PBM agent configuration file options: https://docs.percona.com/percona-backup-mongodb/reference/pbm-agent-config-options.html
- PBM incremental backup guide: https://docs.percona.com/percona-backup-mongodb/usage/backup-incremental.html
- PBM point-in-time recovery guide: https://docs.percona.com/percona-backup-mongodb/features/point-in-time-recovery.html
- PBM backup and restore types: https://docs.percona.com/percona-backup-mongodb/features/backup-types.html
- PBM S3 storage configuration: https://docs.percona.com/percona-backup-mongodb/details/s3-storage.html
- PBM restore options: https://docs.percona.com/percona-backup-mongodb/reference/restore-options.html
- PBM 2.14.0 release notes: https://docs.percona.com/percona-backup-mongodb/release-notes/2.14.0.html
- Percona Server for MongoDB Docker documentation: https://docs.percona.com/percona-server-for-mongodb/6.0/install/docker.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The PBM agent container used `percona/percona-backup-mongodb:2.3.0` and passed the PBM cluster storage config as a `pbm-agent` config file via `--config-file`. Current PBM agent config uses `mongodb-uri` and is started with `-f` when a real agent config file is used; the storage/PITR config belongs in the cluster config stored through `pbm config`. Updated the image to PBM 2.14.0, removed the invalid agent config argument, and added a `pbm config --file` upload step.
- The PBM agent connection string used a replica set URI. PBM documentation recommends each agent connect to its local `mongod` through `localhost` with `authSource=admin`. Updated the agent URI accordingly and used a separate replica set URI for PBM CLI commands.
- The Kubernetes MongoDB snippet used an unsupported `MONGODB_REPLSET` environment variable for the Percona Server for MongoDB image. Removed it and clarified that the example assumes the existing StatefulSet already initializes the replica set and authentication.
- The PBM user example granted `pbmAnyAction` without first creating the role, which would fail. Added the required `db.createRole` call and assigned the documented roles directly in `createUser`.
- The incremental backup script used `pbm backup --type=incremental --base=<backup-name>`, but `--base` is a boolean flag for creating the base incremental backup. Updated the script to create a base incremental backup with `--base` when needed and then run regular incremental backups without `--base`.
- The PITR section used `pbm backup --type=oplog`, which is not a supported backup type. Replaced it with enabling PITR and creating a base logical backup so PBM can begin oplog slicing.
- The restore script did not account for PBM 2.14.0's restore confirmation prompt and did not disable PITR before restore. Added `--yes` for automation and disabled PITR before restore operations.
- The scripts used the legacy `mongo` shell. Updated validation commands to use `mongosh`.
- The monitoring and restore-test examples used undocumented `pbm list --full` and a misleading `pbm list --size` storage usage command. Replaced them with documented `pbm list --size=N` usage and parsing based on current PBM output.

## Review Notes
The Kubernetes manifests are still illustrative and assume an existing production-grade MongoDB StatefulSet handles replica set initialization, authentication, keyfiles, services, and persistent storage. For production, the Percona Operator for MongoDB is usually safer than hand-assembling these pieces, but that broader architectural change was outside the requested scope.
