# Validation Summary: How to Use Database Migration Service (DMS) for Ongoing Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Database Migration Service (AWS DMS)
- AWS CLI
- DMS replication instances, endpoints, and replication tasks
- Change Data Capture (CDC)
- MySQL binary log replication
- PostgreSQL logical replication
- Amazon RDS and Amazon Aurora
- Amazon Redshift, Amazon S3, and Amazon DynamoDB DMS targets
- Amazon CloudWatch metrics and alarms

## Sources Consulted
- AWS CLI Command Reference: create-replication-instance - https://docs.aws.amazon.com/cli/latest/reference/dms/create-replication-instance.html
- AWS CLI Command Reference: create-endpoint - https://docs.aws.amazon.com/cli/latest/reference/dms/create-endpoint.html
- AWS CLI Command Reference: describe-connections - https://docs.aws.amazon.com/cli/latest/reference/dms/describe-connections.html
- AWS CLI Command Reference: describe-replication-task-assessment-results - https://docs.aws.amazon.com/cli/latest/reference/dms/describe-replication-task-assessment-results.html
- AWS DMS User Guide: Using a MySQL-compatible database as a source - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html
- AWS DMS User Guide: Using a PostgreSQL database as a source - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html
- AWS DMS User Guide: Using Amazon S3 as a target - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html
- AWS DMS User Guide: Monitoring AWS DMS tasks - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Monitoring.html
- AWS DMS User Guide: Target metadata task settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.TargetMetadata.html
- AWS DMS User Guide: Change processing tuning settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.ChangeProcessingTuning.html
- AWS DMS User Guide: Transformation rules and actions - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Transformations.html

## Issues Found
- The replication instance command used `--publicly-accessible false`, but AWS CLI models this as paired boolean flags. Changed it to `--no-publicly-accessible`.
- The MySQL and Aurora MySQL source endpoint examples included `--database-name`; AWS CLI DMS documentation cautions not to explicitly specify `DatabaseName` for MySQL endpoints. Removed it from those examples.
- The PostgreSQL endpoint selected `pglogical` while the SQL example manually created a `test_decoding` slot. Changed the endpoint to `PluginName=test_decoding;slotName=dms_slot` so the endpoint matches the slot shown.
- The PostgreSQL permissions example used `GRANT rds_replication` alongside self-managed `postgresql.conf` settings. Changed the self-managed example to `ALTER ROLE ... WITH REPLICATION` and added a short RDS/Aurora note for `rds_replication`.
- Example ARNs used a 9-digit account ID and reused human-readable identifiers where DMS ARNs require generated resource IDs. Updated examples to use a 12-digit account ID and resource-ID-style placeholders.
- The `describe-connections` example used `--filter`, but the AWS CLI command uses `--filters`. Corrected the flag.
- `BatchApplyEnabled` was placed under `ChangeProcessingTuning`, but DMS documents it under `TargetMetadata`. Moved it to `TargetMetadata` and kept `MinTransactionSize` / `CommitTimeout` with `BatchApplyEnabled` set to `false`, where those tuning fields apply.
- The CloudWatch alarm for a replication task metric included only `ReplicationInstanceIdentifier`. Added `ReplicationTaskIdentifier` as the second dimension.
- The troubleshooting command was labeled as viewing task logs but used `describe-replication-task-assessment-results`, which returns assessment results. Replaced it with `describe-replication-instance-task-logs` for task log metadata.

## Review Notes
- The examples remain illustrative and still require real subnet IDs, security group IDs, generated DMS ARNs, credentials, IAM roles, and network access before they can be run.
- PostgreSQL CDC setup varies between self-managed PostgreSQL, Amazon RDS, Aurora PostgreSQL, and read replicas; the post now distinguishes the main self-managed role requirement from the RDS/Aurora role requirement, but production setups should still follow the exact AWS source-engine prerequisites.
