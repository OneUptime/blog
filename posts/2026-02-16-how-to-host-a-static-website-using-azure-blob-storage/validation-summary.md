# Validation Summary: How to Host a Static Website Using Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage static website hosting
- Azure Storage accounts and the `$web` container
- Azure CLI
- Bicep / ARM resource definitions
- AzCopy
- Azure CDN
- GitHub Actions
- DNS CNAME records
- HTTP caching headers

## Sources Consulted
- Microsoft Learn: Static website hosting in Azure Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website
- Microsoft Learn: Host a static website in Azure Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-how-to
- Microsoft Learn: `az storage blob service-properties update`: https://learn.microsoft.com/en-us/cli/azure/storage/blob/service-properties
- Microsoft Learn: `az storage blob upload` and `upload-batch`: https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Microsoft Learn: `Microsoft.Storage/storageAccounts/blobServices` Bicep/ARM reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts/blobservices
- Microsoft Learn: Map a custom domain to an Azure Blob Storage endpoint: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-custom-domain-name
- Microsoft Learn: `az storage account update`: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: `az cdn endpoint create`: https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint
- Microsoft Learn: `az cdn custom-domain enable-https`: https://learn.microsoft.com/en-us/cli/azure/cdn/custom-domain
- Microsoft Learn: Synchronize with Azure Blob Storage by using AzCopy: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-synchronize
- Microsoft Learn: Azure Storage redundancy: https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
- GitHub Actions: `azure/login` action: https://github.com/Azure/login

## Issues Found
- The Bicep section incorrectly stated that Bicep does not have native support for static website properties. Updated the snippet to define `staticWebsite` on the `Microsoft.Storage/storageAccounts/blobServices` child resource, which is supported by the official ARM/Bicep resource schema.
- The cache-control example used `--destination '$web/static'` with `az storage blob upload-batch`. The official CLI syntax expects `--destination` to be the container name or URL, with subpaths supplied via `--destination-path`, so the example now uses `--destination '$web' --destination-path static`.
- The limitations section said authentication would require "Azure CDN with Azure AD." Static website hosting has no built-in Microsoft Entra ID authentication, and Azure CDN is not itself an Entra authentication layer for static sites, so this was changed to reference a separate auth layer or Azure Static Web Apps.
- The limitations section implied only cache-control and content-type headers were possible. Updated it to clarify that the static website feature does not configure arbitrary custom headers, while blob content settings such as cache-control and content-type still apply.
- The limitations section said hosting is limited to a single region. Azure Storage supports several redundancy models, including geo-redundant options, so this was changed to say the site is tied to the storage account endpoint and redundancy configuration, with CDN providing global edge caching.

## Review Notes
- The Azure CDN examples are valid for the current Azure CLI, but Azure Front Door Standard/Premium may be a better modern edge option for some production deployments.
- The Azure CLI storage examples omit explicit `--auth-mode login`, account keys, SAS tokens, or connection strings. They can work when the CLI can infer credentials or query account keys, but production CI/CD workflows should choose an explicit authentication model and assign the least-privilege roles needed.
