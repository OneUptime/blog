# Validation Summary: How to Use Azure RBAC with Attribute-Based Access Control Conditions for Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure RBAC
- Azure ABAC role assignment conditions
- Azure Blob Storage
- Azure Data Lake Storage Gen2
- Blob index tags
- Azure CLI
- Bicep

## Sources Consulted
- Microsoft Learn: Azure role assignment condition format and syntax - https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-format
- Microsoft Learn: What is Azure attribute-based access control (Azure ABAC)? - https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-overview
- Microsoft Learn: Tutorial: Add a role assignment condition to restrict access to blobs using Azure CLI - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-auth-abac-cli
- Microsoft Learn: Actions and attributes for Azure role assignment conditions for Azure Blob Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-auth-abac-attributes
- Microsoft Learn: Example Azure role assignment conditions for Blob Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-auth-abac-examples
- Microsoft Learn: Use blob index tags to manage and find data on Azure Blob Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-index-how-to
- Microsoft Learn: Manage and find Azure Blob data with blob index tags - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-manage-find-blobs
- Microsoft Learn: Access control model in Azure Data Lake Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-access-control-model
- Microsoft Learn: Security considerations for Azure role assignment conditions in Azure Blob Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-auth-abac-security

## Issues Found
- The prerequisites implied blob index tags were broadly available for Azure Data Lake Storage Gen2 and "enabled" by default. Updated the text to distinguish Azure Blob Storage from hierarchical namespace accounts and to note the current Blob Tags without indexing preview caveat.
- The prerequisites omitted the data-plane permissions needed to set and read blob index tags. Added Storage Blob Data Owner or custom blob tag read/write permissions.
- The Azure CLI upload examples used an ampersand-delimited tag string. Updated them to Azure CLI's documented space-separated `key=value` syntax for `--tags`.
- The path-prefix and combined tag condition examples targeted all blob read operations without excluding `Blob.List`. Updated those read-specific examples to use `AND NOT SubOperationMatches{'Blob.List'}`.
- The Bicep role assignment snippet did not scope the role assignment to the storage account. Added an existing storage account resource and `scope: storageAccount`.
- The post referred to Azure AD and broadly stated that SAS tokens bypass RBAC. Updated the wording to Microsoft Entra ID and clarified that Shared Key, account SAS, and service SAS authorization bypass role assignment conditions.
- The condition complexity limit was inaccurate. Updated it to the documented portal visual editor limit of 5 expressions per condition, with code editor and automation options for more expressions.
- The testing guidance incorrectly implied Owner or Contributor roles directly bypass blob-level conditions. Updated it to warn against testing with unconditioned storage data role assignments or alternate authorization paths.

## Review Notes
Azure CLI and Bicep were not installed locally in the review environment, so command and snippet validation was performed against Microsoft Learn documentation rather than local compiler or CLI output. The `az storage blob tag` command group is documented as a preview extension command, which is acceptable for the tutorial but worth monitoring for future CLI changes.
