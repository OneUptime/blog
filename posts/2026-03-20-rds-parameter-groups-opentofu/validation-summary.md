# Validation Summary: How to Configure RDS Parameter Groups with OpenTofu - Rds

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- AWS Amazon RDS
- Amazon RDS DB parameter groups
- PostgreSQL 16 on Amazon RDS
- MySQL 8.0 on Amazon RDS
- AWS CLI

## Sources Consulted
- OpenTofu CLI command docs: https://opentofu.org/docs/cli/commands/
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Amazon RDS parameter groups overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/parameter-groups-overview.html
- DB parameter groups for Amazon RDS DB instances: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithDBInstanceParamGroups.html
- Settings for DB instances: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ModifyInstance.Settings.html
- Using SSL with a PostgreSQL DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- Turning on query logging for your RDS for PostgreSQL DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Concepts.PostgreSQL.Query_Logging.html
- Using PostgreSQL extensions with Amazon RDS for PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Extensions.html
- Parameters for MySQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.Parameters.html
- Specifying DB parameters: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ParamValuesRef.html
- Amazon CloudWatch metrics for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS CLI `describe-db-instances`: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- Rebooting a DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RebootInstance.html
- Amazon RDS for PostgreSQL updates: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html

## Issues Found
- The PostgreSQL example used the `ssl` parameter to require encrypted connections. For Amazon RDS for PostgreSQL, the documented parameter for requiring SSL/TLS connections is `rds.force_ssl`, so the example was corrected to use `rds.force_ssl = 1`.
- The post claimed a CloudWatch alarm on `DatabaseConnections` could detect pending parameter-group reboot status. AWS documents no dedicated CloudWatch metric for DB parameter group `pending-reboot` status, and `DatabaseConnections` measures client connections instead. That section was corrected to use the documented manual reboot workflow after checking parameter apply status with the AWS CLI.
- The deployment verification command returned the full `DBParameterGroups` structure without explicitly surfacing apply status. It was tightened to query `DBParameterGroupName` and `ParameterApplyStatus` directly, which matches the AWS CLI output fields used for pending-reboot checks.
- The conclusion implied a generic restart flow. It was corrected to state that `pending-reboot` changes require a manual reboot, which matches AWS documentation for DB parameter group changes.

## Review Notes
- The review environment didn't have local `tofu` or `aws` binaries installed, so CLI validation was performed against the official OpenTofu and AWS command references rather than local `--help` output.
- RDS for PostgreSQL 15 and later already default `rds.force_ssl` to `1`, so the PostgreSQL 16 example remains valid but the explicit setting is mostly useful for clarity.
- The example pins `engine_version = "16.2"`. AWS still lists Amazon RDS for PostgreSQL 16.2, but newer 16.x minors are available, so teams may prefer a newer minor or a less specific version pin depending on their upgrade policy.
- The MySQL parameter group family `mysql8.0` remains documented. Amazon RDS also documents `mysql8.4`, which has some different defaults such as `innodb_dedicated_server`.
