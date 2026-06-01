# Validation Summary: How to Set Up ACLs and POSIX Permissions in Azure Data Lake Storage Gen2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Data Lake Storage Gen2
- Azure Storage hierarchical namespace
- Azure RBAC
- Azure ABAC
- POSIX-like ACLs
- Azure CLI
- Azure Storage File Data Lake SDK for Python
- Microsoft Entra ID security principals and groups

## Sources Consulted
- Microsoft Learn: Access control model in Azure Data Lake Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-access-control-model
- Microsoft Learn: Access control lists in Azure Data Lake Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-access-control
- Microsoft Learn: Azure CLI `az storage fs access` reference - https://learn.microsoft.com/en-us/cli/azure/storage/fs/access
- Microsoft Learn: Use Python to manage ACLs in Azure Data Lake Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-acl-python
- Microsoft Learn: `azure.storage.filedatalake.DataLakeDirectoryClient` reference - https://learn.microsoft.com/en-us/python/api/azure-storage-file-datalake/azure.storage.filedatalake.datalakedirectoryclient
- Microsoft Learn: `azure.storage.filedatalake.AccessControlChangeResult` reference - https://learn.microsoft.com/en-us/python/api/azure-storage-file-datalake/azure.storage.filedatalake.accesscontrolchangeresult

## Issues Found
- The permission basics described execute permission as executing a file. In ADLS Gen2, execute has no meaning for files and is used to traverse directories. Updated the read, write, and execute descriptions to match the official ADLS Gen2 permission model.
- The RBAC/ACL evaluation explanation was too broad because ACL evaluation applies to Microsoft Entra-based authorization, while Shared Key and service/account SAS authorization are not affected by RBAC or ACLs. Qualified the statement as applying to Microsoft Entra-based requests.
- The named user ACL example contained an invalid object ID typo (`a]b1c2d3...`) and omitted a mask entry while granting a named user. Replaced it with a valid GUID-shaped placeholder and added `mask::r-x`.
- The recursive ACL Python example accessed `directories_successful`, `files_successful`, and `failure_count` directly on the `AccessControlChangeResult`. The SDK exposes those counts on `result.counters`, so the print statements were updated accordingly.

## Review Notes
- The Azure CLI command examples use the documented `az storage fs access set` and `az storage fs access show` parameters.
- The Python examples use current `azure-storage-file-datalake` client methods. The local environment did not have the Azure SDK installed, so SDK verification was performed against Microsoft Learn API reference documentation.
- The post correctly recommends group-based ACLs and notes that default ACL changes do not update existing child items, which aligns with Microsoft guidance.
