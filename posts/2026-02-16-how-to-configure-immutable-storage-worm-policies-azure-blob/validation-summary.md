# Validation Summary: How to Configure Immutable Storage with WORM Policies in Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure immutable storage / WORM policies
- Azure CLI
- Azure Storage SDK for Python
- Azure Activity Log

## Sources Consulted
- Microsoft Learn: Store business-critical blob data with immutable storage in a write once, read many (WORM) state: https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview
- Microsoft Learn: Container-level WORM policies for immutable blob data: https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-container-level-worm-policies
- Microsoft Learn: Version-level WORM policies for immutable blob data: https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-version-level-worm-policies
- Microsoft Learn: Configure immutability policies for blob versions: https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-policy-configure-version-scope
- Microsoft Learn: Azure CLI az storage container immutability-policy: https://learn.microsoft.com/en-us/cli/azure/storage/container/immutability-policy
- Microsoft Learn: Azure CLI az storage container legal-hold: https://learn.microsoft.com/en-us/cli/azure/storage/container/legal-hold
- Microsoft Learn: Azure CLI az storage account and blob-service-properties: https://learn.microsoft.com/en-us/cli/azure/storage/account and https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties
- Microsoft Learn: Set Blob Immutability Policy REST API and Azure Storage Blob SDK ImmutabilityPolicy class: https://learn.microsoft.com/en-us/rest/api/storageservices/set-blob-immutability-policy and https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.immutabilitypolicy

## Issues Found
- The post said several regulations require immutability for specified retention periods. I softened this to say they can drive retention and tamper-protection requirements, because HIPAA and GDPR are not direct WORM-retention mandates in the same way as SEC/CFTC requirements.
- The post said any immutable policy prevents modification or deletion. I narrowed this to locked time-based policies, because unlocked time-based policies can still be changed or deleted and do not provide the same delete protection.
- The post said there are three time-based policy states but listed two. I corrected this to two states.
- The unlocked policy description only said retention could be extended. I corrected it to note that unlocked policies can be shortened or extended, or deleted.
- The container-level section implied all immutability policies are container-level. I changed this to specifically describe container-level policies, since Azure also supports version-level policies.
- The version-level setup command used invalid/currently unsupported flags on `az storage account update` and implied account-level version-level WORM support can be enabled after account creation. I replaced it with `az storage account create --enable-alw true --immutability-period --immutability-state` and a separate `az storage account blob-service-properties update --enable-versioning true`.
- The operations list incorrectly allowed snapshots under immutable policies. I moved snapshot creation to the blocked list for active container-level policies.
- The delete example implied any immutability policy blocks deletion. I clarified that the example fails for locked immutability policies or legal holds.
- The storage account requirements were incomplete. I updated the account-type support language for container-level and version-level WORM policies.
- The audit section said Azure Activity Log is itself immutable. I corrected this to say logs can be used as evidence, but immutable audit evidence requires exporting logs to an immutable destination.
- The cost section said immutable data cannot be moved to cheaper tiers. Azure allows access-tier changes in some immutable storage scenarios, so I changed this to focus on deletion restrictions and deliberate tier planning.

## Review Notes
Azure CLI was not installed in the local environment, so CLI command validation was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
