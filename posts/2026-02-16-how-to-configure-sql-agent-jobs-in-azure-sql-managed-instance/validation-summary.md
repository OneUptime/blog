# Validation Summary: How to Configure SQL Agent Jobs in Azure SQL Managed Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Managed Instance
- SQL Server Agent
- Transact-SQL
- SQL Server Agent schedules
- Database Mail
- SQL Server Agent operators and notifications
- SQL Server Agent job history tables

## Sources Consulted
- Microsoft Learn: Automate management tasks using SQL Agent jobs in Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/job-automation-managed-instance?view=azuresql
- Microsoft Learn: T-SQL differences between SQL Server and Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/transact-sql-tsql-differences-sql-server?view=azuresql
- Microsoft Learn: sp_add_schedule (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-add-schedule-transact-sql?view=sql-server-ver17
- Microsoft Learn: sp_add_jobstep (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-add-jobstep-transact-sql?view=sql-server-ver17
- Microsoft Learn: sysmail_add_account_sp (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sysmail-add-account-sp-transact-sql?view=sql-server-ver17
- Microsoft Learn: Configure SQL Server Agent Mail to use Database Mail - https://learn.microsoft.com/en-us/sql/relational-databases/database-mail/configure-sql-server-agent-mail-to-use-database-mail?view=sql-server-ver17
- Microsoft Learn: Time zones in Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/timezones-overview?view=azuresql

## Issues Found
- The limitations list incorrectly stated that PowerShell job steps are not supported at all. Updated this to describe the documented Managed Instance limitations, including no PowerShell Core support and no importing external modules.
- The limitations list incorrectly stated that no Replication Agent jobs are supported. Updated it to note that Transaction Log Reader, Snapshot, and Distribution job steps are supported, while Merge and Queue Reader steps are not.
- The data archival example captured `@@ROWCOUNT` after `COMMIT TRANSACTION`, which would not reliably report the number of deleted rows. Moved the `@@ROWCOUNT` capture immediately after the `DELETE`.
- The monthly schedule used `@freq_type = 32` with `@freq_interval = 1`, which schedules the first Sunday of the month, not the first day of the month. Changed it to `@freq_type = 16` and `@freq_interval = 1`.
- The Database Mail profile used `SQLAlerts`, but SQL Agent email notifications in Azure SQL Managed Instance require the profile name `AzureManagedInstance_dbmail_profile`. Updated the profile creation and profile-account association.
- The job history status mapping omitted `run_status = 4` for in-progress job history rows. Added the missing status.
- The migration section said schedules should be adjusted for UTC. Updated this to the documented behavior: SQL Server Agent schedules follow the instance time zone, with UTC as the default if no time zone was specified during instance creation.
- The summary repeated the unsupported-step and UTC schedule inaccuracies. Updated it to match the corrected Managed Instance behavior.

## Review Notes
The examples use `sp_MSforeachtable`, which is commonly used in SQL Server examples but is undocumented. A future improvement would be to replace it with a documented cursor or generated T-SQL over `sys.tables` and `sys.schemas`.
