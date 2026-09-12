# Validation Summary: Schedule Azure SQL Maintenance Without SQL Server Agent

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Azure SQL Database
- Azure SQL Elastic Jobs
- Transact-SQL (T-SQL)
- Microsoft Entra ID user-assigned managed identities
- Azure SQL service-managed private endpoints
- Azure Monitor alerts
- SQL statistics maintenance

## Sources Consulted

- [Automation in Azure SQL overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/job-automation-overview?view=azuresql)
- [Elastic jobs in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-overview?view=azuresql)
- [Create and manage elastic jobs by using T-SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-tsql-create-manage?view=azuresql)
- [jobs.sp_add_target_group](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-add-target-group-elastic-jobs-transact-sql?view=azuresqldb-current)
- [jobs.sp_add_target_group_member](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-add-target-group-member-elastic-jobs-transact-sql?view=azuresqldb-current)
- [jobs.sp_add_job](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-add-job-elastic-jobs-transact-sql?view=azuresqldb-current)
- [jobs.sp_add_jobstep](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-add-jobstep-elastic-jobs-transact-sql?view=azuresqldb-current)
- [jobs.sp_update_job](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-update-job-elastic-jobs-transact-sql?view=azuresqldb-current)
- [jobs.sp_start_job](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-start-job-elastic-jobs-transact-sql?view=azuresqldb-current)
- [UPDATE STATISTICS](https://learn.microsoft.com/en-us/sql/t-sql/statements/update-statistics-transact-sql?view=sql-server-ver17)
- [Index maintenance guidance](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/reorganize-and-rebuild-indexes?view=sql-server-ver17)

## Issues Found
No technical issues found.

## Review Notes
The sample assumes that the named user-assigned managed identity is already assigned to the Elastic job agent and that Microsoft Entra prerequisites for creating the contained database user are in place, as the post states. Elastic Jobs execution history is currently purged automatically after 45 days, so the recommendation to export records for longer retention is appropriate. The schedule date is intentionally an example and must be replaced with a future UTC date when deployed.
