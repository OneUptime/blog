# Validation Summary: Secure Azure SQL Elastic Jobs with Private Endpoints

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Azure SQL Database Elastic Jobs
- Elastic Jobs service-managed private endpoints
- Microsoft Entra ID authentication
- User-assigned managed identities
- Azure SQL logical-server networking and firewall controls
- Transact-SQL Elastic Jobs stored procedures
- Azure Monitor alerts for Elastic Jobs

## Sources Consulted

- [Elastic Jobs overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-overview?view=azuresql)
- [Create, configure, and manage Elastic Jobs](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-tutorial?view=azuresql)
- [Create and manage Elastic Jobs by using T-SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-tsql-create-manage?view=azuresql)
- [jobs.sp_add_target_group_member](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-add-target-group-member-elastic-jobs-transact-sql?view=azuresqldb-current)
- [jobs.sp_add_jobstep](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-add-jobstep-elastic-jobs-transact-sql?view=azuresqldb-current)
- [jobs.sp_start_job](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-start-job-elastic-jobs-transact-sql?view=azuresqldb-current)
- [Microsoft Entra service principals with Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-service-principal?view=azuresql)
- [Azure SQL Database firewall rules](https://learn.microsoft.com/en-us/azure/azure-sql/database/firewall-configure?view=azuresql)
- [Azure Private Link for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview?view=azuresql)

## Issues Found

No technical issues found.

## Review Notes

The T-SQL examples use the current Elastic Jobs stored procedures and valid parameter names. The post correctly distinguishes service-managed Elastic Jobs private endpoints from customer-managed Azure Private Link endpoints, separates network reachability from database authorization, and notes that credential parameters must be omitted when the agent uses a user-assigned managed identity. The documented limitation that Microsoft Entra-only authentication is unsupported for Elastic Jobs remains a deployment consideration, but the post does not instruct readers to enable Entra-only authentication.
