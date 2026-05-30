# Validation Summary: How to Set Up Unity Catalog for Data Governance in Azure Databricks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Databricks
- Unity Catalog
- Azure Data Lake Storage Gen2
- Databricks Access Connector for Azure
- Microsoft Entra ID
- Azure CLI
- Databricks SQL
- Delta Lake

## Sources Consulted
- Azure Databricks: Create a Unity Catalog metastore: https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/create-metastore
- Azure Databricks: Use Azure managed identities in Unity Catalog to access storage: https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-storage/azure-managed-identities
- Azure Databricks: Connect to an ADLS Gen2 external location: https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-storage/external-locations-adls
- Azure Databricks: Unity Catalog privileges reference: https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/access-control/privileges-reference
- Azure Databricks SQL: CREATE EXTERNAL LOCATION: https://learn.microsoft.com/en-us/azure/databricks/sql/language-manual/sql-ref-syntax-ddl-create-location
- Azure Databricks SQL: ALTER TABLE: https://learn.microsoft.com/en-us/azure/databricks/sql/language-manual/sql-ref-syntax-ddl-alter-table
- Azure Databricks: Data lineage in Unity Catalog: https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/data-lineage
- Azure CLI: az role assignment: https://learn.microsoft.com/en-us/cli/azure/role/assignment

## Issues Found
- The metastore description said the metastore storage holds governance metadata. Updated it to say the metastore registers catalogs, securable objects, and permissions, matching current Unity Catalog documentation.
- The post used the older "Azure Active Directory" name. Updated references to "Microsoft Entra ID".
- The metastore storage section said Unity Catalog needs storage for managed tables and metastore metadata. Updated it to say Unity Catalog can use storage for managed tables and managed volumes.
- The Azure CLI role assignment omitted `--assignee-principal-type ServicePrincipal`, which Microsoft recommends with `--assignee-object-id` to avoid Microsoft Graph propagation issues. Added the flag.
- The account console navigation used **Data**. Updated it to **Catalog**, matching current Azure Databricks documentation.
- The storage credential SQL snippet did not match the current official Azure Databricks setup flow for Azure managed identity credentials. Replaced it with Catalog Explorer steps and kept the documented SQL syntax for creating the external location.
- The external location explanation implied generic access was enough to create external tables. Updated it to refer to the required privileges on the external location.
- The lineage section said lineage is enabled by default for Delta tables. Updated it to the current documented behavior: Unity Catalog captures lineage automatically for supported queries run on Azure Databricks against tables registered in Unity Catalog.

## Review Notes
The remaining SQL examples for catalogs, schemas, grants, tables, comments, and tags are consistent with current Databricks SQL syntax. The post could later mention compute and permission prerequisites for running Unity Catalog SQL examples, but the existing prerequisite list is sufficient for a setup guide.
