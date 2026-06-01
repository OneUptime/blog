# Validation Summary: How to Rotate Azure Storage Account Access Keys Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage accounts
- Azure Storage account access keys
- Azure CLI
- Azure Key Vault
- Azure Event Grid
- Azure Functions
- Azure SDK for Python
- Azure PowerShell
- Managed identities
- Microsoft Entra ID

## Sources Consulted
- Microsoft Learn: Manage storage account access keys - https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage
- Microsoft Learn: az storage account keys - https://learn.microsoft.com/en-us/cli/azure/storage/account/keys
- Microsoft Learn: Storage Accounts - Regenerate Key REST API - https://learn.microsoft.com/en-us/rest/api/storagerp/storage-accounts/regenerate-key
- Microsoft Learn: azure.mgmt.storage StorageAccountsOperations.regenerate_key - https://learn.microsoft.com/en-us/python/api/azure-mgmt-storage/azure.mgmt.storage.operations.storageaccountsoperations
- Microsoft Learn: Rotation tutorial for resources with two sets of credentials - https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation-dual
- Microsoft Learn: Authorize operations for data access - https://learn.microsoft.com/en-us/azure/storage/common/authorize-data-access
- Microsoft Learn: Authorize access to blobs with Microsoft Entra ID - https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-access-azure-active-directory

## Issues Found
- The opening paragraph described access keys as granting full control over the storage account. Updated it to say they grant full access to storage account data and can be used to generate SAS tokens, matching Microsoft guidance.
- The Key Vault inspection comments implied the connection string itself identifies the key name. Updated the comments to say the AccountKey value must be compared with the listed storage account keys.
- The Key Vault automation section described setting a secret expiration as creating a rotation policy. Updated the text to describe the documented Event Grid SecretNearExpiry plus Azure Function pattern, and changed the tag to `managed-by=rotation-function`.
- The example secret expiration date was already in the past as of validation date 2026-06-01. Updated it to a future example date.
- The Python `regenerate_key` calls used `key_name` in the request body. Updated them to the documented `keyName` field.
- The Python automation script treated any non-key1 match as key2. Added an explicit key2 match and a failure path when the Key Vault secret does not match either storage account key.
- Updated Azure AD references to the current Microsoft Entra ID product name.

## Review Notes
The Azure CLI examples using `--key key1` and `--key key2` are valid; current CLI documentation accepts `key1`, `key2`, `primary`, and `secondary`. The post's overall rotation sequence matches Microsoft guidance, but real production automation should also handle account SAS or service SAS tokens signed with the rotated key, because storage account key regeneration revokes SAS tokens based on that key.
