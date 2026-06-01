# Validation Summary: How to Create a Dedicated SQL Pool in Azure Synapse Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Synapse Analytics
- Dedicated SQL pool
- Azure CLI
- Azure Data Lake Storage Gen2
- Azure RBAC and managed identities
- T-SQL table design and COPY INTO

## Sources Consulted
- Microsoft Learn: Quickstart: Create an Azure Synapse Analytics workspace with the Azure CLI - https://learn.microsoft.com/en-us/azure/synapse-analytics/quickstart-create-workspace-cli
- Microsoft Learn: az synapse workspace CLI reference - https://learn.microsoft.com/en-us/cli/azure/synapse/workspace
- Microsoft Learn: az synapse sql pool CLI reference - https://learn.microsoft.com/en-us/cli/azure/synapse/sql/pool
- Microsoft Learn: az synapse workspace firewall-rule CLI reference - https://learn.microsoft.com/en-us/cli/azure/synapse/workspace/firewall-rule
- Microsoft Learn: az role assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Manage compute resources for dedicated SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/sql-data-warehouse-manage-compute-overview
- Microsoft Learn: Memory and concurrency limits for dedicated SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/memory-concurrency-limits
- Microsoft Learn: Guidance for designing distributed tables using dedicated SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/sql-data-warehouse-tables-distribute
- Microsoft Learn: Design guidance for replicated tables - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/design-guidance-for-replicated-tables
- Microsoft Learn: Best practices for dedicated SQL pools - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/best-practices-dedicated-sql-pool
- Microsoft Learn: Tutorial: Load external data using a managed identity - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/tutorial-external-tables-using-managed-identity

## Issues Found
- The prerequisites said "Contributor or Synapse Administrator" permissions were enough. I changed this to Azure RBAC permissions sufficient to create resources and role assignments, because Synapse Administrator is a Synapse workspace role and does not grant Azure resource creation or Azure RBAC assignment permissions.
- The workspace creation flow did not grant the workspace managed identity access to the data lake, but the later COPY INTO example uses managed identity authentication. I added Azure CLI commands to assign Storage Blob Data Contributor to the workspace managed identity on the storage account.
- The DWU concurrency table had stale values for DW2000c and DW5000c. I updated them to the current workload group maximums from Microsoft documentation.
- The replicated dimension examples used clustered columnstore indexes, and the text recommended columnstore indexes on all non-staging tables. Microsoft guidance notes that small tables may not benefit from clustered columnstore indexes, and replicated tables are generally intended for small dimensions. I changed the small replicated dimension examples to HEAP and narrowed the index recommendation to large analytical tables.
- The replicated table size guidance said "under a few hundred MB." I updated it to "typically under 2 GB compressed," matching Microsoft guidance.

## Review Notes
The post is technically relevant and validated after the corrections above. The local environment did not have the Azure CLI installed, so CLI command validation was performed against official Microsoft Learn CLI references rather than local `az --help` output.
