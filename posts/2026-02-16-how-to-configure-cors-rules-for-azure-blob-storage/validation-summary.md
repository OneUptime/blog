# Validation Summary: How to Configure CORS Rules for Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Storage CORS
- Azure CLI
- Azure SDK for Python
- Azure SDK for .NET
- Azure Resource Manager templates
- Terraform AzureRM provider
- Browser CORS behavior

## Sources Consulted
- Microsoft Learn: Cross-Origin Resource Sharing (CORS) support for Azure Storage: https://learn.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services
- Microsoft Learn: Set Blob Service Properties REST API: https://learn.microsoft.com/en-us/rest/api/storageservices/set-blob-service-properties
- Microsoft Learn: Preflight Blob Request REST API: https://learn.microsoft.com/en-us/rest/api/storageservices/preflight-blob-request
- Microsoft Learn: Azure CLI `az storage cors`: https://learn.microsoft.com/en-us/cli/azure/storage/cors
- Microsoft Learn: Azure SDK for Python `BlobServiceClient`: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobserviceclient
- Microsoft Learn: Azure SDK for Python `CorsRule`: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.corsrule
- Microsoft Learn: Azure SDK for .NET `BlobCorsRule`: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.models.blobcorsrule
- Microsoft Learn: ARM template reference for `Microsoft.Storage/storageAccounts/blobServices`: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts/blobservices
- HashiCorp Terraform Registry: `azurerm_storage_account`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- MDN Web Docs: CORS preflight request: https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request

## Issues Found
- The original CORS flow explanation implied that every cross-origin blob fetch sends a preflight OPTIONS request. This is not accurate for simple CORS requests such as a basic GET; preflight is used for non-simple requests. Updated the explanation to distinguish simple requests from preflighted requests.
- The Mermaid sequence diagram showed a preflight before a simple GET download. Updated the diagram to show a non-simple PUT upload preflight, while leaving the actual GET example as a normal CORS request.
- Several Azure CLI examples used comma-separated header lists. The official Azure CLI documentation describes these parameters as space-separated lists. Updated the affected `--allowed-headers` and `--exposed-headers` examples to use space-separated values.
- The video streaming example listed response headers such as `Accept-Ranges` and `Content-Range` as allowed request headers. Reduced the allowed request headers to `Range` and kept the response headers in `--exposed-headers`.
- The manual curl preflight test used `curl -I -X OPTIONS`. Replaced it with `curl -i -X OPTIONS` so the command explicitly sends OPTIONS and prints response headers without also using curl's HEAD shortcut.

## Review Notes
- Azure Storage CORS rules are service-level settings and support up to five rules per storage service, as stated in the post.
- The Python, .NET, ARM template, and Terraform examples use current documented APIs and field names.
- The local environment did not have Azure CLI installed, so CLI validation was performed against official Microsoft Learn documentation rather than local `az --help` output.
