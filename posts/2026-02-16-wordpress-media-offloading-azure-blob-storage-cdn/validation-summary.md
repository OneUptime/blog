# Validation Summary: How to Use WordPress Media Offloading to Azure Blob Storage with CDN Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Blob Storage
- Azure Front Door CDN
- Azure CLI
- AzCopy
- WordPress media uploads and hooks
- WP-CLI
- PHP

## Sources Consulted
- Microsoft Learn: Create an Azure storage account: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Microsoft Learn: Azure CLI `az storage container create`: https://learn.microsoft.com/en-us/cli/azure/storage/container
- Microsoft Learn: Azure Front Door CLI quickstart: https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-cli
- Microsoft Learn: Azure Front Door rules with Azure CLI: https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/front-door-add-rules-cli
- Microsoft Learn: Azure Front Door caching: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching
- Microsoft Learn: Azure Front Door custom domains and HTTPS: https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-configure-https-custom-domain
- Microsoft Learn: `az afd` CLI reference: https://learn.microsoft.com/en-us/cli/azure/afd
- Microsoft Learn: Put Blob REST API: https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob
- Microsoft Learn: Authorize with Shared Key: https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key
- Microsoft Learn: AzCopy with Blob Storage: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs
- WordPress.org plugin directory: Microsoft Azure Storage for WordPress: https://wordpress.org/plugins/windows-azure-storage/
- WP Offload Media official documentation: https://deliciousbrains.com/wp-offload-media/doc/quick-start-guide/
- Azure Storage PHP client library retirement notice: https://github.com/Azure/azure-storage-php

## Issues Found
- The post used Azure CDN Standard from Microsoft (`az cdn ... --sku Standard_Microsoft`) for a new deployment. Updated the CDN setup to use Azure Front Door Standard/Premium via `az afd`, which is the current Microsoft-recommended CDN platform for new deployments.
- The old CDN endpoint URL format `azureedge.net` was no longer appropriate for the revised Front Door setup. Updated examples to use the Azure Front Door endpoint format `wp-media-cdn-<hash>.z01.azurefd.net`.
- The custom domain and HTTPS commands used classic Azure CDN commands. Replaced them with Azure Front Door custom domain and route association commands.
- The cache-rule commands used classic CDN rule commands and classic duration formatting. Replaced them with Azure Front Door rule set and rule commands, using the documented `hh:mm:ss` cache duration format.
- The storage account example created a public container but did not explicitly allow blob public access at the account level. Added `--allow-blob-public-access true`.
- The container creation command omitted an explicit data-plane authorization mode. Added `--auth-mode login`.
- The Front Door origin group needed a probe path that can return success from Blob Storage. Added a small `health.txt` blob upload and pointed the health probe at `/media/health.txt`.
- The plugin section incorrectly claimed WP Offload Media supports Azure. Removed that claim and corrected the plugin attribution to the current WordPress.org listing.
- The custom PHP REST example did not send an Azure Storage `Authorization` header, so uploads would fail. Updated the sample to create a signed Shared Key `Put Blob` request.
- The custom upload sample deleted the local original file too early, which can break WordPress image metadata and thumbnail generation. Removed that deletion from the upload function.
- The thumbnail upload sample built thumbnail paths from the current upload directory instead of the attachment file directory. Updated it to use `dirname(get_attached_file($attachment_id))`.
- The post recommended the retired `microsoft/azure-storage-blob` PHP package as the official production SDK. Replaced that recommendation with a note that the package is retired and that production code should use a maintained plugin or custom authorization/retry handling.
- The AzCopy migration command did not mention authentication or a write-capable SAS token. Added `azcopy login` guidance.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI references rather than local `az --help` output. PHP was also not installed locally, so the PHP snippets were reviewed statically against PHP syntax and Azure Storage REST authentication requirements.
