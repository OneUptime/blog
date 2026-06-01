# Validation Summary: How to Integrate Azure Data Lake Storage Gen2 with Azure Databricks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Data Lake Storage Gen2
- Azure Databricks
- Apache Spark and PySpark
- Delta Lake
- Microsoft Entra ID service principals
- Azure RBAC
- Azure Key Vault
- Databricks secrets and secret scopes
- Databricks DBFS mounts
- Unity Catalog
- Azure CLI
- Databricks CLI

## Sources Consulted
- Microsoft Learn: Tutorial: Azure Data Lake Storage, Azure Databricks & Spark - https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-use-databricks-spark
- Microsoft Learn: Best practices for DBFS and Unity Catalog - https://learn.microsoft.com/en-us/azure/databricks/dbfs/unity-catalog
- Microsoft Learn: Secret management - https://learn.microsoft.com/en-us/azure/databricks/security/secrets/
- Microsoft Learn: Databricks CLI secrets command group - https://learn.microsoft.com/en-us/azure/databricks/dev-tools/cli/reference/secrets-commands
- Microsoft Learn: Use a secret in a Spark configuration property or environment variable - https://learn.microsoft.com/en-us/azure/databricks/security/secrets/secrets-spark-conf-env-var
- Microsoft Learn: Run a job with a Microsoft Entra ID service principal - https://learn.microsoft.com/en-us/azure/databricks/jobs/how-to/run-jobs-with-service-principals
- Microsoft Learn: Connect to cloud object storage using Unity Catalog - https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-storage/
- Microsoft Learn: Use Azure managed identities in Unity Catalog to access storage - https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-storage/azure-managed-identities
- Microsoft Learn: Azure CLI az ad sp reference - https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Microsoft Learn: Azure CLI az ad app credential reference - https://learn.microsoft.com/en-us/cli/azure/ad/app/credential
- Microsoft Learn: Azure CLI az role assignment reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Databricks REST API: Create a new secret scope - https://docs.databricks.com/api/workspace/secrets/createscope

## Issues Found
- The Databricks CLI example for creating an Azure Key Vault-backed secret scope used legacy-style `--scope`, `--resource-id`, and `--dns-name` flags. Current Databricks CLI documentation shows `create-scope SCOPE` and `--json`, with Azure Key Vault metadata supplied in the request body. Updated the command to use `--json` with `scope`, `scope_backend_type`, and `backend_azure_keyvault` fields.
- The role assignment command used `--assignee <service-principal-object-id>`. The current Azure CLI supports this, but the object-id-specific documented pattern is `--assignee-object-id` with `--assignee-principal-type ServicePrincipal`, which also avoids Microsoft Graph lookup ambiguity. Updated the command accordingly.
- The post presented DBFS mounts as a general current pattern without noting Databricks' current guidance. Databricks now documents DBFS mounts as deprecated and recommends Unity Catalog volumes or external locations for new workspaces. Added a concise caveat while preserving the legacy mount example.
- Updated identity terminology from Azure AD to Microsoft Entra ID where it affected current technical accuracy, and clarified that managed identity access for modern Databricks storage governance is configured through Unity Catalog storage credentials and an Azure Databricks access connector.

## Review Notes
The direct ABFS Spark configuration, `abfss://` URI format, PySpark read/write examples, Delta write example, secret retrieval with `dbutils.secrets.get`, and cluster-level OAuth Spark configuration are consistent with official Azure Databricks and Azure Storage documentation. For future revisions, consider adding a Unity Catalog-first setup path, because it is now the recommended storage-governance model for new Azure Databricks deployments.
