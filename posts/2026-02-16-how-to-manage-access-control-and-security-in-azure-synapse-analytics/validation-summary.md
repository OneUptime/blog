# Validation Summary: How to Manage Access Control and Security in Azure Synapse Analytics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Synapse Analytics
- Azure CLI
- Azure RBAC
- Synapse RBAC
- Dedicated SQL pools and serverless SQL pools
- Microsoft Entra ID authentication
- Transact-SQL permissions
- Row-level security
- Dynamic data masking
- Azure Data Lake Storage Gen2 ACLs
- SQL auditing
- Managed virtual networks and managed private endpoints

## Sources Consulted
- Microsoft Learn: Azure Synapse workspace CLI reference - https://learn.microsoft.com/en-us/cli/azure/synapse/workspace
- Microsoft Learn: Azure Synapse workspace firewall-rule CLI reference - https://learn.microsoft.com/en-us/cli/azure/synapse/workspace/firewall-rule
- Microsoft Learn: Azure Synapse managed private endpoints CLI reference - https://learn.microsoft.com/en-us/cli/azure/synapse/managed-private-endpoints
- Microsoft Learn: Azure Synapse SQL Microsoft Entra admin CLI reference - https://learn.microsoft.com/en-us/cli/azure/synapse/sql/ad-admin
- Microsoft Learn: Azure Synapse SQL audit-policy CLI reference - https://learn.microsoft.com/en-us/cli/azure/synapse/sql/audit-policy
- Microsoft Learn: Azure Synapse RBAC overview - https://learn.microsoft.com/en-us/azure/synapse-analytics/security/synapse-workspace-synapse-rbac
- Microsoft Learn: Azure Synapse RBAC roles - https://learn.microsoft.com/en-us/azure/synapse-analytics/security/synapse-workspace-synapse-rbac-roles
- Microsoft Learn: Azure Synapse managed virtual network - https://learn.microsoft.com/en-us/azure/synapse-analytics/security/synapse-workspace-managed-vnet
- Microsoft Learn: SQL authentication in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/sql-authentication
- Microsoft Learn: T-SQL features in Synapse SQL pools - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/overview-features
- Microsoft Learn: Data Lake Storage Gen2 ACL CLI reference - https://learn.microsoft.com/en-us/cli/azure/storage/fs/access
- Microsoft Learn: Dynamic Data Masking - https://learn.microsoft.com/en-us/sql/relational-databases/security/dynamic-data-masking
- Microsoft Learn: CREATE SECURITY POLICY (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-security-policy-transact-sql

## Issues Found
- The introduction implied Synapse includes a data lake as a native engine. Changed this to integration with a data lake.
- The managed VNet explanation incorrectly stated that all Synapse compute runs inside the managed VNet. Updated it to clarify that data integration and Spark resources are deployed there, while SQL pools are multitenant services outside it.
- The managed private endpoint CLI example used non-existent parameters for `az synapse managed-private-endpoints create`. Replaced them with the documented `--pe-name` and `--file` parameters.
- The Synapse RBAC role table overstated the SQL Administrator and Artifact User permissions and used the old abbreviated Spark role name. Updated the wording to match the built-in role documentation.
- The SQL pool security section said the full SQL Server security model is available. Narrowed this to familiar SQL Server-style security features because Synapse SQL has feature differences.
- The dedicated SQL pool role assignment used `ALTER ROLE ... ADD MEMBER`, but Microsoft documents `EXEC sp_addrolemember` for dedicated SQL pools. Updated the example.
- The Microsoft Entra admin CLI command used the wrong command group, `az synapse workspace ad-admin`. Corrected it to `az synapse sql ad-admin update`.
- The Data Lake Storage ACL examples omitted an authentication mode. Added `--auth-mode login` to align with Microsoft Entra identity-based ACL management.
- The SQL auditing command used the wrong command group and omitted the blob storage target flag. Corrected it to `az synapse sql audit-policy update` with `--blob-storage-target-state Enabled`.

## Review Notes
The post uses the older "Azure AD" terminology in the tag metadata, but the body now uses Microsoft Entra ID where authentication is discussed. The Azure CLI was not installed locally, so command validation was performed against current Microsoft Learn CLI references.
