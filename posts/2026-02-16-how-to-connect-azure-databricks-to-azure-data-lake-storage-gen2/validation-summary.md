# Validation Summary: How to Connect Azure Databricks to Azure Data Lake Storage Gen2

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Azure Databricks
- Azure Data Lake Storage Gen2
- Apache Spark ABFS configuration
- Databricks secrets
- Databricks CLI
- Azure CLI
- Azure RBAC
- DBFS mounts
- Unity Catalog storage credentials and external locations

## Sources Consulted
- Azure Databricks tutorial for connecting to Azure Data Lake Storage with service principal OAuth: https://learn.microsoft.com/en-us/azure/databricks/connect/storage/tutorial-azure-storage
- Azure Databricks DBFS mounts documentation: https://learn.microsoft.com/en-us/azure/databricks/dbfs/mounts
- Azure Databricks DBFS and Unity Catalog best practices: https://learn.microsoft.com/en-us/azure/databricks/dbfs/unity-catalog
- Azure Databricks ADLS Gen2 external locations and storage credentials: https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-storage/external-locations-adls
- Azure Databricks storage credentials reference: https://learn.microsoft.com/en-us/azure/databricks/sql/language-manual/sql-ref-storage-credentials
- Azure Databricks external location permissions documentation: https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-storage/manage-external-locations
- Azure CLI `az ad sp create-for-rbac` reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Azure CLI `az role assignment create` reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment

## Issues Found
- The connection-method overview and comparison table listed Azure AD credential passthrough, but the body of the post used DBFS mounts as Method 4. I changed those entries to DBFS mounts so the overview and table match the actual method described.
- The service principal creation command used `--skip-assignment`, which is no longer documented for `az ad sp create-for-rbac`. I removed the flag because the current Azure CLI documentation states that role assignment is not created by default unless `--role` and `--scopes` are supplied.
- The Unity Catalog example used SQL to create a storage credential with managed identity. Current Databricks documentation describes creating the ADLS Gen2 storage credential through Catalog Explorer, CLI, API, or Terraform. I changed the example to use `databricks storage-credentials create` with an Azure managed identity access connector.
- The external location SQL used `WITH (STORAGE CREDENTIAL ...)`; current examples use `WITH (CREDENTIAL ...)`. I updated the snippet to match the documented syntax.
- The Unity Catalog grants gave `WRITE FILES` without `READ FILES` to the `data-engineers` group. Databricks documents that `WRITE FILES` also requires `READ FILES`, so I changed the grant to include both privileges.

## Review Notes
DBFS mounts are technically still documented, but Databricks marks DBFS root and DBFS mounts as deprecated and recommends Unity Catalog volumes, external locations, or workspace files instead. The post already presents mounts as legacy and recommends moving away from them.
