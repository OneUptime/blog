# Validation Summary: How to Configure Azure Blob Storage Integration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Blob Storage
- Azure Storage accounts, containers, redundancy, access tiers, lifecycle management, SAS, and immutable storage
- Azure CLI
- Azure Monitor diagnostic settings and metric alerts
- Python Azure SDK (`azure-storage-blob`, `azure-identity`)
- Restic Azure backend
- Velero Azure plugin

## Sources Consulted
- Microsoft Learn: Azure CLI `az storage account` documentation - https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az storage account encryption-scope` documentation - https://learn.microsoft.com/en-us/cli/azure/storage/account/encryption-scope?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az storage container` documentation - https://learn.microsoft.com/en-us/cli/azure/storage/container?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az storage blob` documentation - https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-latest
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure - https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn: Access tiers for blob data - https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Microsoft Learn: Azure Storage data redundancy - https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
- Microsoft Learn: Azure CLI `az storage container immutability-policy` documentation - https://learn.microsoft.com/en-us/cli/azure/storage/container/immutability-policy?view=azure-cli-latest
- Microsoft Learn: Immutable storage for blob data - https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings` documentation - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings?view=azure-cli-latest
- Microsoft Learn: Supported Azure Monitor metrics for storage accounts - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-metrics
- Microsoft Learn: Get started with Azure Blob Storage and Python - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-python-get-started
- Microsoft Learn: `azure.storage.blob.ContainerClient` API reference - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.containerclient?view=azure-python
- Restic documentation: Microsoft Azure Blob Storage backend - https://restic.readthedocs.io/en/latest/030_preparing_a_new_repo.html#microsoft-azure-blob-storage
- Velero Azure plugin documentation - https://github.com/velero-io/velero-plugin-for-microsoft-azure/blob/main/README.md

## Issues Found
- The container creation example said it created a container with a specific access tier, but Azure containers do not have container-level access tiers. I changed the example to create an Azure Storage encryption scope and use it as the container's default encryption scope.
- The Archive tier retrieval wording said "Hours." I changed it to "Up to 15 hours to rehydrate" to match Azure Blob Storage documentation and make clear that Archive blobs must be rehydrated before normal reads.
- The immutable storage example applied an immutability policy to a container that had not been created and used a placeholder ETag for locking. I added the container creation command and changed the lock command to use the documented wildcard `--if-match "*"` form.
- The Velero Azure plugin example used an older plugin version and omitted the current `useAAD="true"` backup location option for the service principal/Azure AD path. I updated the plugin image tag and backup location config to match the current Azure plugin documentation.

## Review Notes
- Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI references rather than local `az --help` output.
- The example storage account name is syntactically valid, but real storage account names must be globally unique across Azure.
- Restic's Azure backend now also supports SAS, Azure CLI credentials, service principal environment credentials, workload identities, and managed identities; the account-key example remains valid.
