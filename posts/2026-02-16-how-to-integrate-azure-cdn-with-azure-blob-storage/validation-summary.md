# Validation Summary: How to Integrate Azure CDN with Azure Blob Storage for Faster Content Delivery

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure CDN Standard from Microsoft (classic)
- Azure Front Door Standard/Premium
- Azure Blob Storage
- Azure CLI
- Bicep / ARM resources
- Azure Monitor metrics
- HTTP caching headers and CDN cache behavior

## Sources Consulted
- Microsoft Learn: Comparison between Azure Front Door and Azure CDN services - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-cdn-comparison
- Microsoft Azure pricing: Content Delivery Network retirement notice - https://azure.microsoft.com/en-us/pricing/details/cdn/
- Microsoft Learn: Azure CDN library overview with retirement notices - https://learn.microsoft.com/en-us/azure/cdn/cdn-app-dev-net
- Microsoft Learn: Azure CLI `az cdn endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint
- Microsoft Learn: Azure CLI `az cdn endpoint rule` reference - https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint/rule
- Microsoft Learn: Azure CLI `az cdn custom-domain` reference - https://learn.microsoft.com/en-us/cli/azure/cdn/custom-domain
- Microsoft Learn: Azure CLI `az storage blob upload` reference - https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Microsoft Learn: `Microsoft.Cdn/profiles/endpoints@2023-05-01` Bicep/ARM reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/2023-05-01/profiles/endpoints
- Microsoft Learn: Azure Front Door caching behavior - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching
- Microsoft Learn: CDN guidance in Azure Architecture Center - https://learn.microsoft.com/en-us/azure/architecture/best-practices/cdn

## Issues Found
- The post listed retired Azure CDN providers as current options. Updated the tier section to state that Azure CDN from Akamai retired in 2023, Azure CDN Standard/Premium from Verizon/Edgio retired on January 15, 2025, and Azure CDN Standard from Microsoft (classic) is on a retirement path for September 30, 2027.
- The post said Azure CDN Standard from Microsoft had no rules engine. Corrected this because Microsoft documents the standard rules engine for Azure CDN Standard from Microsoft.
- The post presented `az cdn profile create --sku Standard_Microsoft` as a current setup path. Updated the CLI and Bicep examples to reference an existing classic CDN profile, because new Azure CDN Standard from Microsoft (classic) profile and domain creation is no longer supported in 2026.
- The custom domain section showed new custom domain onboarding and Azure-managed HTTPS certificates as the normal path. Updated it to note that new custom domain onboarding and managed certificates are no longer supported for Azure CDN Standard from Microsoft (classic), and changed the HTTPS command to use a customer-managed Key Vault certificate.
- The direct Blob Storage restriction section implied that SAS tokens could be used as an origin secret known only to the CDN. Reworded this to clarify that SAS tokens are typically client-facing signed URLs and that Azure Front Door Premium with Private Link is the cleaner option for private Blob origins in new deployments.

## Review Notes
The remaining Azure CDN commands and Bicep properties were checked against Microsoft references for syntax and current parameter names. The Azure CLI was not installed in the local workspace, so command validation was performed against official Microsoft CLI documentation rather than local `az --help` output.
