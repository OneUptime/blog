# Validation Summary: How to Set Up DMS for MySQL to Aurora Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Database Migration Service (DMS)
- Amazon Aurora MySQL-Compatible Edition
- Amazon RDS / Aurora CLI provisioning
- AWS CLI
- MySQL binary logging and CDC
- DMS table mappings, task settings, endpoint settings, monitoring, and validation
- Python / PyMySQL row count validation

## Sources Consulted
- AWS CLI Command Reference: `rds create-db-cluster` - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
- Amazon Aurora User Guide: Creating an Amazon Aurora DB cluster - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.CreateInstance.html
- Amazon Aurora MySQL Release Notes: Aurora MySQL 3.07.0 deprecated release page - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.Updates.3070.html
- AWS CLI Command Reference: `dms create-endpoint` - https://docs.aws.amazon.com/cli/latest/reference/dms/create-endpoint.html
- AWS CLI Command Reference: `dms test-connection` - https://docs.aws.amazon.com/cli/latest/reference/dms/test-connection.html
- AWS DMS User Guide: Using a MySQL-compatible database as a source - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html
- AWS DMS User Guide: Using a MySQL-compatible database as a target - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.MySQL.html
- AWS DMS User Guide: Choosing the right DMS replication instance - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.Types.html
- AWS DMS User Guide: Target metadata task settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.TargetMetadata.html
- AWS DMS User Guide: Full-load task settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.FullLoad.html
- AWS DMS User Guide: Logging task settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.Logging.html
- AWS DMS User Guide: Data validation task settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.DataValidation.html
- AWS DMS User Guide: Monitoring AWS DMS tasks - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Monitoring.html
- MySQL 8.0 Reference Manual: Binary logging options and variables - https://dev.mysql.com/doc/mysql/8.0/en/replication-options-binary-log.html
- MySQL 5.7 Reference Manual: Binary logging options and variables - https://dev.mysql.com/doc/refman/5.7/en/replication-options-binary-log.html

## Issues Found
- The Aurora cluster example used `--master-user-password 'YourStr0ngP@ss!'`, but the RDS CLI documents that Aurora master passwords cannot contain `/`, `"`, or `@`. Changed the password examples to `YourStr0ngP4ss!`.
- The Aurora cluster example pinned `8.0.mysql_aurora.3.07.0`, which AWS now marks as deprecated. Changed the example to `--engine-version 8.0` so RDS selects the current default Aurora MySQL version 3 release.
- The source and target DMS endpoint examples specified `--database-name myapp` for MySQL-compatible endpoints. AWS CLI documentation says MySQL source or target endpoints should not explicitly specify `DatabaseName`; schemas are selected in table mappings. Removed `--database-name` from both endpoint examples.
- The target endpoint placed `parallelLoadThreads=8` in extra connection attributes. AWS documents `ParallelLoadThreads` as a MySQL endpoint setting passed through `--my-sql-settings`, and its valid range is 1-5. Changed the command to `--my-sql-settings '{"ParallelLoadThreads": 5}'`.
- The target endpoint used lowercase/incomplete `initstmt` syntax. AWS documents the extra connection attribute as `Initstmt=SET FOREIGN_KEY_CHECKS=0;`. Updated the target endpoint example accordingly.
- The source endpoint included `Initstmt=SET FOREIGN_KEY_CHECKS=0`, which is a target-side full-load setting and not needed for reading from the source. Removed it from the source endpoint example.
- The table mapping example was labeled as JSON but contained a `//` comment, which would make `file://table-mappings.json` invalid JSON. Moved the explanation outside the JSON block.
- The source prerequisites and common troubleshooting notes only mentioned `REPLICATION SLAVE`, but AWS DMS MySQL CDC also requires `REPLICATION CLIENT` and `SELECT` on source tables. Added the missing privilege guidance.
- The target prerequisites did not mention `local_infile = 1`, which AWS DMS requires for loading into a MySQL-compatible target. Added that prerequisite.
- The binlog retention check only used `binlog_expire_logs_seconds`, which is the MySQL 8.0 variable. Added the older `expire_logs_days` check for MySQL 5.7 and earlier, and updated the configuration snippet to use the current MySQL 8.0 variable with an older-version note.
- The security group placeholder was too short to resemble a valid modern security group ID. Updated it to a syntactically plausible placeholder.

## Review Notes
- AWS currently recommends DMS homogeneous data migrations for MySQL-to-MySQL-compatible migrations when possible because it uses native tools for better performance and accuracy. The post remains valid as a DMS replication task tutorial, but future revisions could mention homogeneous data migrations as an alternative.
- The DMS ARN values are illustrative placeholders. In a real run, users should use the ARNs returned by the `create-replication-instance`, `create-endpoint`, and `create-replication-task` commands.
