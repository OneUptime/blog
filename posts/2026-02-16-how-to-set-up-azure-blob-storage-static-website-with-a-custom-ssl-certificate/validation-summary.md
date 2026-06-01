# Validation Summary: How to Set Up Azure Blob Storage Static Website with a Custom SSL Certificate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage static website hosting
- Azure Storage `$web` container
- Azure CLI
- Azure CDN Standard from Microsoft classic
- Azure Front Door Standard/Premium
- Azure DNS CNAME records
- Azure Key Vault certificates
- Custom domains and HTTPS/TLS
- CDN rules engine URL rewrite and redirect rules

## Sources Consulted
- Microsoft Learn: Static website hosting in Azure Storage - https://learn.microsoft.com/azure/storage/blobs/storage-blob-static-website
- Microsoft Learn: Host a static website in Azure Storage - https://learn.microsoft.com/azure/storage/blobs/storage-blob-static-website-how-to
- Microsoft Learn: Map a custom domain to an Azure Blob Storage endpoint - https://learn.microsoft.com/azure/storage/blobs/storage-custom-domain-name
- Microsoft Learn: Azure CDN endpoint CLI reference - https://learn.microsoft.com/cli/azure/cdn/endpoint
- Microsoft Learn: Azure CDN custom-domain CLI reference - https://learn.microsoft.com/cli/azure/cdn/custom-domain
- Microsoft Learn: Azure CDN endpoint rule CLI reference - https://learn.microsoft.com/cli/azure/cdn/endpoint/rule
- Microsoft Learn: Azure DNS CNAME CLI reference - https://learn.microsoft.com/cli/azure/network/dns/record-set/cname
- Microsoft Learn: Azure Storage blob CLI reference - https://learn.microsoft.com/cli/azure/storage/blob
- Microsoft Learn: Comparison between Azure Front Door and Azure CDN services - https://learn.microsoft.com/azure/cdn/cdn-features
- Microsoft Azure CDN pricing page with retirement notice - https://azure.microsoft.com/pricing/details/cdn/

## Issues Found
- The post said the default Azure Storage static website endpoint only supports HTTP. Microsoft documentation shows static website endpoints can be HTTPS on the default `*.web.core.windows.net` host, while HTTPS for custom domains is not natively supported by Azure Storage. Updated the opening explanation to distinguish default endpoint HTTPS from custom-domain HTTPS.
- The post instructed readers to create an Azure CDN Standard from Microsoft profile with `--sku Standard_Microsoft`. Current Microsoft documentation states Azure CDN Standard from Microsoft classic is on a retirement path, no new instances can be created after October 1, 2025, and the service retires on September 30, 2027. Removed the new profile creation command and clarified the CDN commands apply only to existing Azure CDN classic profiles.
- The post recommended Azure CDN-managed certificates. Current Microsoft documentation states Azure-managed certificates are no longer supported on Azure CDN Standard from Microsoft classic starting August 15, 2025, and existing managed certificates remained valid only until April 14, 2026. Removed the managed-certificate workflow and made Key Vault BYOC the Azure CDN classic path.
- The SPA routing text said the rule catches requests that do not match a file. The rule actually matches requests without a file extension. Updated the wording to match the `UrlFileExtension` condition.
- The wrap-up implied Azure CDN managed certificates were still a valid option. Updated it to distinguish existing Azure CDN classic BYOC from new Azure Front Door deployments.

## Review Notes
Azure CDN Standard from Microsoft classic remains represented because the post is about Azure CDN, but new deployments should use Azure Front Door Standard or Premium. The Azure CDN rules CLI group is still marked preview in Microsoft CLI documentation, so future revisions should consider replacing the legacy CDN walkthrough with an Azure Front Door Standard/Premium walkthrough.
