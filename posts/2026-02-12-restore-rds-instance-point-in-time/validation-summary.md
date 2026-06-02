# Validation Summary: How to Restore an RDS Instance to a Point in Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- AWS CLI
- AWS CloudWatch Metrics
- AWS CloudWatch Logs
- boto3 for Python
- PostgreSQL tooling (`pg_dump`, `psql`)

## Sources Consulted
- Amazon RDS User Guide, Restoring a DB instance to a specified time: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html
- AWS CLI `restore-db-instance-to-point-in-time` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-instance-to-point-in-time.html
- AWS CLI `describe-db-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- AWS CLI `describe-db-instance-automated-backups` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instance-automated-backups.html
- AWS CLI `logs filter-log-events` command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html
- boto3 RDS `restore_db_instance_to_point_in_time` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/restore_db_instance_to_point_in_time.html
- boto3 RDS `describe_db_instances` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/describe_db_instances.html

## Issues Found
- The first restorable-window AWS CLI example incorrectly mapped both `EarliestRestore` and `LatestRestore` to `LatestRestorableTime`. Changed it to use `describe-db-instance-automated-backups` and `RestoreWindow.EarliestTime` / `RestoreWindow.LatestTime`, which is the API shape that exposes both values.
- The CloudWatch Logs example used epoch millisecond timestamps for February 12, 2024 while the surrounding examples use February 12, 2026. Updated the values to `1770904800000` and `1770908400000`, matching `2026-02-12T14:00:00Z` through `2026-02-12T15:00:00Z`.
- The Python example described UTC datetimes but used a timezone-naive incident time and compared it to a boto3 response datetime by stripping timezone data from `LatestRestorableTime`. Updated the script to normalize the requested restore time to UTC and compare timezone-aware datetimes.
- The Python example always included `DBSubnetGroupName` and `VpcSecurityGroupIds`, even when the config omitted them. Passing `None` for a boto3 string parameter can fail client-side validation, so the script now only adds those optional parameters when values are provided.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was checked against official AWS CLI command references instead of local `--help` output. The post is accurate for standard Amazon RDS DB instances; Aurora point-in-time restore uses cluster restore APIs and is outside this post's stated DB instance scope.
