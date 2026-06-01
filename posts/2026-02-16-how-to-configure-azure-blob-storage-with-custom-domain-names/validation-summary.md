# Validation Summary: How to Configure Azure Blob Storage with Custom Domain Names

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Storage static website hosting
- Azure Storage custom domains
- Azure Front Door Standard/Premium
- Azure DNS
- Azure CLI
- Azure Key Vault certificates
- DNS CNAME, TXT, and apex alias records
- HTTPS/TLS certificates

## Sources Consulted
- Microsoft Learn: Map a custom domain to an Azure Blob Storage endpoint - https://learn.microsoft.com/azure/storage/blobs/storage-custom-domain-name
- Microsoft Learn: Azure Front Door and Azure CDN tier comparison and retirement notes - https://learn.microsoft.com/azure/frontdoor/standard-premium/tier-comparison
- Microsoft Learn: Azure CLI `az afd profile` - https://learn.microsoft.com/cli/azure/afd/profile
- Microsoft Learn: Azure CLI `az afd custom-domain` - https://learn.microsoft.com/cli/azure/afd/custom-domain
- Microsoft Learn: Azure CLI `az afd route` - https://learn.microsoft.com/cli/azure/afd/route
- Microsoft Learn: Azure CLI `az afd secret` - https://learn.microsoft.com/cli/azure/afd/secret
- Microsoft Learn: Azure Front Door Standard/Premium custom domain guidance - https://learn.microsoft.com/azure/frontdoor/standard-premium/how-to-add-custom-domain
- Microsoft Learn: Azure Front Door domains and validation - https://learn.microsoft.com/azure/frontdoor/domain
- Microsoft Learn: Azure Front Door apex domains - https://learn.microsoft.com/azure/frontdoor/apex-domain

## Issues Found
- The original production HTTPS path used Azure CDN Standard from Microsoft commands (`az cdn ... --sku Standard_Microsoft`). Microsoft documentation says Azure CDN from Microsoft (classic) no longer supports new profile or domain onboarding after August 15, 2025 and is on a retirement path. Replaced the CDN flow with Azure Front Door Standard/Premium commands.
- The original article described CDN-managed certificates and `azureedge.net` endpoint behavior. Updated the endpoint, certificate, and verification wording to use Azure Front Door managed certificates and `azurefd.net`.
- The original custom-domain flow implied a CNAME was sufficient for current Front Door Standard/Premium onboarding. Added the DNS validation token/TXT-record requirement for domains that are not already validated or prevalidated.
- The original caching command used `az cdn endpoint rule add`. Replaced it with the current `az afd route update` caching options.
- The original bring-your-own-certificate example used Azure CDN HTTPS flags. Replaced it with Azure Front Door secret creation and custom-domain update commands, and corrected the Key Vault reference to the certificate's secret resource path.
- The original static website endpoint showed a concrete zone value (`z13`) as if it were fixed. Changed it to `<zone-id>` and updated the Front Door origin example accordingly.
- The original direct CNAME section did not mention that HTTP-only access also requires the storage account to allow HTTP. Added that caveat.
- The original apex-domain example pointed at a classic CDN endpoint resource path. Updated it to an Azure Front Door endpoint resource path.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was done against Microsoft Learn command references rather than local `az --help` output.
