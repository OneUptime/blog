# Validation Summary: How to Back Up MongoDB to Azure Blob Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (`mongodump`, `mongorestore`)
- Azure Blob Storage
- Azure CLI (`az`)
- Azure Managed Identity
- Azure Blob Lifecycle Management Policies
- Azure Automation (Python runbook)
- Bash scripting

## Sources Consulted
- MongoDB `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- Azure CLI `az storage blob upload` reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob#az-storage-blob-upload
- Azure CLI `az storage blob download` reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob#az-storage-blob-download
- Azure CLI `az role assignment create` reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment#az-role-assignment-create
- Azure CLI `az storage account management-policy create` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/management-policy#az-storage-account-management-policy-create
- Azure Blob Storage durability and redundancy: https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
- Azure Blob lifecycle management policy schema: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview
- Azure built-in roles for Blob Storage: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#storage-blob-data-contributor

## Issues Found
No technical issues found.

## Review Notes
- `datetime.datetime.utcnow()` used in the Python runbook is deprecated since Python 3.12 in favor of `datetime.datetime.now(datetime.UTC)`. It still works and is acceptable for a tutorial, but could be updated in a future revision.
- The post correctly uses `--auth-mode login` throughout, which is the recommended approach for Azure AD and Managed Identity authentication rather than storage account keys.
- The lifecycle policy correctly tiers from Cool (set at upload) to Archive after 30 days, then deletes after 90 days. This is a reasonable retention strategy.
