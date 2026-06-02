# Validation Summary: How to Set Up DMS for SQL Server to RDS Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Database Migration Service
- Amazon RDS for SQL Server
- Microsoft SQL Server
- SQL Server CDC
- SQL Server Agent
- AWS CLI
- Amazon CloudWatch
- Python pyodbc

## Sources Consulted
- AWS DMS User Guide: Using a Microsoft SQL Server database as a source for AWS DMS - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SQLServer.html
- AWS DMS User Guide: Capturing data changes for ongoing replication from SQL Server - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SQLServer.CDC.html
- AWS DMS User Guide: Target metadata task settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.TargetMetadata.html
- AWS DMS User Guide: Data validation task settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.DataValidation.html
- AWS DMS User Guide: Monitoring AWS DMS tasks - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Monitoring.html
- AWS DMS User Guide: Selection rules and actions - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Selections.html
- AWS CLI Command Reference: dms create-endpoint - https://docs.aws.amazon.com/cli/latest/reference/dms/create-endpoint.html
- AWS CLI Command Reference: dms create-replication-task - https://docs.aws.amazon.com/cli/latest/reference/dms/create-replication-task.html
- AWS CLI Command Reference: rds create-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- Amazon RDS User Guide: Microsoft SQL Server versions on Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Concepts.General.VersionSupport.html
- Amazon RDS User Guide: Using SQL Server Agent for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.SQLServer.CommonDBATasks.Agent.html
- Microsoft Learn: sys.sp_cdc_enable_table - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sys-sp-cdc-enable-table-transact-sql
- Microsoft Learn: Database-level roles - https://learn.microsoft.com/en-us/sql/relational-databases/security/authentication-access/database-level-roles

## Issues Found
- The source CDC prerequisite skipped AWS DMS requirements for full backups and a Full or Bulk Logged recovery model. Added the recovery model and backup steps.
- The CDC setup described MS-CDC as universally required for ongoing replication. Clarified that DMS uses SQL Server replication for self-managed source tables with primary keys and MS-CDC for tables without primary keys.
- The DMS user example omitted documented full-load and CDC permissions such as `VIEW DEFINITION`, `VIEW SERVER STATE`, and `msdb` backup metadata access. Added the missing grants and changed deprecated role membership calls to `ALTER ROLE`.
- The RDS creation command used a SQL Server master password containing `@`, which RDS disallows for master passwords. Replaced it consistently with a valid example password.
- The RDS gp3 command omitted `--iops`, which the AWS CLI requires when `--storage-type gp3` is specified. Added `--iops 3000`.
- The tutorial created a SQL Server RDS instance but did not create the target database referenced by the DMS target endpoint. Added a wait and `sqlcmd` command to create `myapp`.
- The SQL Server source endpoint used a `SafeguardPolicy` value through generic extra connection attributes. Updated it to the documented `--microsoft-sql-server-settings` JSON form and corrected the explanation of the default safeguard method.
- The DMS task settings placed `BatchApplyEnabled` in the wrong settings group and included `BatchApplyPreserveTransaction`, which AWS documents as Oracle-target-specific. Moved `BatchApplyEnabled` to `TargetMetadata` and removed `BatchApplyPreserveTransaction`.
- The CloudWatch metric commands supplied only `ReplicationTaskIdentifier`; DMS task metrics are published against the combined `ReplicationInstanceIdentifier` and `ReplicationTaskIdentifier` dimensions. Added the replication instance dimension.
- The post said DMS drops non-primary-key indexes during full load. Updated this to the more accurate statement that DMS does not create secondary indexes or foreign keys on the target.
- The validation command implied a running task could be modified with a partial settings object. Updated the example to stop the task and modify it using a complete task settings file that includes the validation settings.
- The troubleshooting note implied MS-CDC itself reads from the log for DMS. Clarified that MS-CDC jobs mark log entries as processed and can cause log growth if they fail or fall behind.

## Review Notes
The tutorial is technically valid after the fixes. It now uses the broad `sysadmin` setup path for a self-managed SQL Server source; a future hardening pass could expand the documented non-sysadmin wrapper and distributor setup instead of granting sysadmin privileges.
