# Validation Summary: How to Migrate SharePoint On-Premises Document Libraries to Azure Blob Storage

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- SharePoint Server / SharePoint document libraries
- PnP PowerShell
- SharePoint CSOM
- Azure Blob Storage
- Azure PowerShell Az.Storage
- Azure Cosmos DB for NoSQL
- C#
- PowerShell

## Sources Consulted
- PnP PowerShell installation documentation: https://pnp.github.io/powershell/articles/installation.html
- PnP PowerShell Connect-PnPOnline documentation: https://pnp.github.io/powershell/cmdlets/Connect-PnPOnline.html
- PnP PowerShell Get-PnPFile documentation: https://pnp.github.io/powershell/cmdlets/Get-PnPFile.html
- PnP PowerShell Get-PnPFileVersion documentation: https://pnp.github.io/powershell/cmdlets/Get-PnPFileVersion.html
- PowerShell Gallery SharePointPnPPowerShell2019 package: https://www.powershellgallery.com/packages/SharePointPnPPowerShell2019/3.9.1905.0
- Azure Storage naming and metadata rules: https://learn.microsoft.com/en-us/rest/api/storageservices/Naming-and-Referencing-Containers--Blobs--and-Metadata
- Azure Blob metadata REST documentation: https://learn.microsoft.com/en-us/rest/api/storageservices/setting-and-retrieving-properties-and-metadata-for-blob-resources
- Azure PowerShell Set-AzStorageBlobContent documentation: https://learn.microsoft.com/en-us/powershell/module/az.storage/set-azstorageblobcontent
- Azure PowerShell New-AzStorageContainer documentation: https://learn.microsoft.com/en-us/powershell/module/az.storage/new-azstoragecontainer
- Azure PowerShell Get-AzStorageBlob documentation: https://learn.microsoft.com/en-us/powershell/module/az.storage/get-azstorageblob
- Azure Blob index tags documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-index-how-to
- Azure Blob access tiers documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Azure Cosmos DB items documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/account-databases-containers-items
- Azure Cosmos DB Container.UpsertItemAsync API documentation: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.container.upsertitemasync
- SharePoint CSOM FileVersion.OpenBinaryStream documentation: https://learn.microsoft.com/en-us/dotnet/api/microsoft.sharepoint.client.fileversion.openbinarystream
- SharePoint CSOM File.Versions documentation: https://learn.microsoft.com/en-us/dotnet/api/microsoft.sharepoint.client.file.versions

## Issues Found
- The post claimed permissions were preserved, but the examples only stored optional permission metadata and did not map SharePoint permissions to Azure authorization or ACLs. Updated the description and introduction to avoid overstating permission preservation.
- The prerequisite installed the modern `PnP.PowerShell` module, which is primarily for Microsoft 365/SharePoint Online and is not the correct documented choice for a SharePoint Server 2019 on-premises migration script. Updated the example to use `SharePointPnPPowerShell2019` and noted the corresponding older farm modules.
- The inventory script included folders even though it described cataloging documents. Added a folder filter.
- The migration script said it preserved metadata as blob metadata and tags, but it only used the `-Metadata` parameter. Updated the text to say blob metadata only.
- The blob path calculation hard-coded a `/sites/{site}/{library}` pattern, which breaks for subsites, alternate managed paths, and library names requiring regex escaping. Updated the migration and validation examples to derive and escape the library root URL.
- The Azure Blob metadata limit was described vaguely as "a certain size." Updated it to the documented 8 KiB total metadata limit.
- The Cosmos DB C# model used `Id`, but Cosmos DB for NoSQL requires the JSON `id` property and treats casing as significant. Changed the property to `id`.
- The C# snippet referenced `PermissionEntry` without defining it. Added a minimal class definition so the example is complete.
- The version-history example used `Get-PnPFileVersion` and `$version.Url`; this is not suitable for the SharePoint Server legacy PnP module path. Reworked the example to use SharePoint CSOM `File.Versions` and `FileVersion.OpenBinaryStream`.

## Review Notes
PowerShell was not installed in the local container, so I could not run a local parser check. The PowerShell and C# examples were reviewed against the documented cmdlet/API signatures. In a production migration, permission preservation still requires a separate authorization design, such as exporting SharePoint ACLs for audit or mapping principals to Azure RBAC/ADLS Gen2 ACLs where appropriate.
