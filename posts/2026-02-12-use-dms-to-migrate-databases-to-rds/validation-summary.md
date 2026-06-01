# Validation Summary: How to Use DMS to Migrate Databases to RDS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Database Migration Service (DMS)
- Amazon RDS
- AWS CLI
- MySQL
- PostgreSQL
- CloudWatch metrics

## Sources Consulted
- AWS CLI Command Reference: create-replication-instance - https://docs.aws.amazon.com/cli/latest/reference/dms/create-replication-instance.html
- AWS CLI Command Reference: create-replication-task - https://docs.aws.amazon.com/cli/latest/reference/dms/create-replication-task.html
- AWS CLI Command Reference: create-endpoint - https://docs.aws.amazon.com/cli/latest/reference/dms/create-endpoint.html
- AWS CLI Command Reference: test-connection - https://docs.aws.amazon.com/cli/latest/reference/dms/test-connection.html
- AWS CLI Command Reference: describe-connections - https://docs.aws.amazon.com/cli/latest/reference/dms/describe-connections.html
- AWS DMS User Guide: Choosing the right AWS DMS replication instance - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.Types.html
- AWS DMS User Guide: Using a MySQL-compatible database as a source - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html
- AWS DMS User Guide: Using a PostgreSQL database as a source - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html
- AWS DMS User Guide: Selection rules and actions - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Selections.html
- AWS DMS User Guide: Target metadata task settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.TargetMetadata.html
- AWS DMS User Guide: Data validation task settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.DataValidation.html
- AWS DMS User Guide: AWS DMS data validation - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html
- AWS DMS User Guide: Creating a task - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.Creating.html
- AWS DMS User Guide: Using DMS Schema Conversion - https://docs.aws.amazon.com/dms/latest/userguide/schema-conversion.html

## Issues Found
- The `create-replication-instance` command used `--replication-subnet-group-id`, but the AWS CLI option is `--replication-subnet-group-identifier`. Updated the command.
- The `create-replication-instance` command used `--publicly-accessible false`, but the AWS CLI uses boolean flags. Updated it to `--no-publicly-accessible`.
- The `describe-connections` command used `--filter`, but the AWS CLI option is `--filters`. Updated the command.
- The post implied DMS migration tasks include schema conversion. Updated the description and added a note that heterogeneous migrations should convert or pre-create the target schema before running the migration task.
- The PostgreSQL CDC setup mixed self-managed PostgreSQL settings with RDS PostgreSQL role guidance. Split the examples and added the RDS PostgreSQL `rds.logical_replication` and role requirements.

## Review Notes
The local workspace does not have the AWS CLI installed, so command verification was done against the current official AWS CLI reference. The example ARNs remain placeholders and should be replaced with the actual ARNs returned by AWS when readers create DMS resources.
