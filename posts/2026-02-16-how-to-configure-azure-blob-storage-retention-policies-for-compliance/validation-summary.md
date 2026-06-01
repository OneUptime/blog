# Validation Summary: How to Configure Azure Blob Storage Retention Policies for Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure immutable storage / WORM policies
- Azure CLI
- Azure Storage SDK for Python
- Azure Policy
- GDPR, HIPAA, SEC 17a-4, and SOX compliance scenarios

## Sources Consulted
- Microsoft Learn: Overview of immutable storage for blob data - https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview
- Microsoft Learn: Configure immutability policies for blob versions - https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-policy-configure-version-scope
- Microsoft Learn: Azure CLI `az storage account` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure CLI `az storage account blob-service-properties` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties
- Microsoft Learn: Azure CLI `az storage container-rm` reference - https://learn.microsoft.com/en-us/cli/azure/storage/container-rm
- Microsoft Learn: Azure CLI `az storage container immutability-policy` reference - https://learn.microsoft.com/en-us/cli/azure/storage/container/immutability-policy
- Microsoft Learn: Azure CLI `az storage container legal-hold` reference - https://learn.microsoft.com/en-us/cli/azure/storage/container/legal-hold
- Microsoft Learn: ARM template reference for `Microsoft.Storage/storageAccounts/blobServices/containers/immutabilityPolicies` - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts/blobservices/containers/immutabilitypolicies
- Azure SDK for Python reference: `azure.storage.blob.BlobClient.upload_blob` and `ImmutabilityPolicy` - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobclient
- HHS.gov: HIPAA Privacy Rule medical record retention FAQ - https://www.hhs.gov/hipaa/for-professionals/faq/580/does-hipaa-require-covered-entities-to-keep-medical-records-for-any-period/index.html

## Issues Found
- The storage account creation command used `--enable-version-level-immutability`, which is not the current Azure CLI option. Changed it to `--enable-alw true`, which is the documented account-level immutability flag.
- The account creation command tried to enable blob versioning directly with `az storage account create --enable-versioning true`. Current Azure CLI documentation enables blob versioning through `az storage account blob-service-properties update --enable-versioning`, so the command was split into account creation plus blob service properties update.
- Step 2 did not create the container before applying the immutability policy. Added `az storage container-rm create` with `--enable-vlw true`, matching Microsoft guidance for containers that support version-level immutability.
- The policy verification command used `az storage container show` and queried `properties.immutabilityPolicy`. Changed it to `az storage container immutability-policy show`, which directly returns the immutability policy and ETag.
- The Python example used `datetime.utcnow()`, which is deprecated in modern Python and returns a naive datetime. Updated it to `datetime.now(timezone.utc)` for an explicit UTC timestamp.
- The ADLS Gen2 caveat said version-level immutability works with hierarchical namespace as of early 2026. Microsoft documentation currently says container-level WORM is supported with hierarchical namespace, but version-level WORM is not. Updated the prerequisite and troubleshooting text.
- The Azure Policy example used a container-level field path that does not match the documented immutability policy child resource. Updated the example to audit `Microsoft.Storage/storageAccounts/blobServices/containers/immutabilityPolicies` and the `default.immutabilityPeriodSinceCreationInDays` field.
- The HIPAA quick reference incorrectly implied HIPAA generally requires 6-10 year medical-record retention. Updated it to distinguish HIPAA documentation retention from medical-record retention, which HHS says is generally governed by state law.
- The GDPR quick reference was too absolute about deletion rights. Updated it to note that retention obligations and legal bases can affect erasure handling.
- The closing troubleshooting note said retention policies apply to blob versions without scoping that statement. Clarified that this applies to version-level immutability.

## Review Notes
Azure CLI was not installed in the local environment, so CLI validation was performed against the current Microsoft Learn Azure CLI reference rather than local `az --help` output. The Azure Policy example now audits existing immutability policy resources below the retention threshold; a production policy that must also flag containers with no policy should add an `auditIfNotExists` rule and be tested in the target tenant.
