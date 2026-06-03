# Validation Summary: How to Configure RDS Parameter Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS DB parameter groups
- AWS CLI for RDS
- Amazon RDS for PostgreSQL
- Amazon RDS for MySQL
- Amazon RDS for MariaDB
- Boto3 for RDS
- Terraform AWS provider

## Sources Consulted
- Amazon RDS User Guide - Overview of parameter groups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/parameter-groups-overview.html
- Amazon RDS User Guide - Specifying DB parameters and formulas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ParamValuesRef.html
- Amazon RDS User Guide - RDS for PostgreSQL memory: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Tuning.concepts.memory.html
- Amazon RDS User Guide - Working with RDS for PostgreSQL parameters: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Parameters.html
- Amazon RDS User Guide - RDS for MySQL database log overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html
- Amazon RDS User Guide - RDS DB instance storage: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- AWS CLI Command Reference - create-db-parameter-group: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-parameter-group.html
- AWS CLI Command Reference - modify-db-parameter-group: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-parameter-group.html
- AWS CLI Command Reference - describe-db-parameters: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-parameters.html
- MySQL 8.0 Reference Manual - InnoDB redo log: https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- Terraform AWS provider - aws_db_parameter_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group

## Issues Found
- PostgreSQL `shared_buffers` and `effective_cache_size` formulas used raw bytes percentages (`{DBInstanceClassMemory/4}` and `{DBInstanceClassMemory*3/4}`), but these PostgreSQL parameters are numeric values in 8 KB pages when no unit is specified. Updated them to `{DBInstanceClassMemory/32768}` for roughly 25% memory and `{DBInstanceClassMemory*3/32768}` for roughly 75% memory.
- `effective_cache_size` was marked as static and configured with `ApplyMethod=pending-reboot`. PostgreSQL treats it as a planner setting that can be changed without restart, so it was updated to dynamic/immediate.
- The MySQL 8.0 example used `innodb_log_file_size`. For RDS for MySQL 8.0.33 and later, AWS documents `innodb_redo_log_capacity` as the parameter used instead, so the command and explanation were updated.
- The post claimed all RDS storage is SSD. AWS still documents magnetic storage as an RDS storage type, so the SSD-specific recommendation was narrowed to SSD storage types such as gp2, gp3, io1, and io2.
- The non-default parameter listing command filtered `Source != system`, which can include engine defaults. Updated it to use `--source user`, which is the AWS CLI-supported filter for user-modified parameters.
- The comparison script skipped parameters with no `ParameterValue` key, which could hide differences where one group has an explicit value and the other has no value. Updated it to record missing values as `None`.
- The Terraform example did not set `apply_method = "pending-reboot"` for static `shared_buffers`, while the provider default is `immediate`. Added the explicit apply method to avoid API errors for the static parameter.
- The MySQL `max_connections` note gave a fixed per-connection memory estimate. Reworded it because per-connection memory varies with MySQL session buffers and workload.

## Review Notes
- AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI command reference rather than local `aws --help` output.
- PostgreSQL and MySQL tuning values in the post are reasonable starting points, but production values should still be tested against the workload and instance class.
