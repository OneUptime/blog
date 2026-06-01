# Validation Summary: How to Configure Azure CDN with a Custom Domain and Managed Certificate

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure CDN Standard from Microsoft
- Azure CDN custom domains
- Azure CDN managed HTTPS certificates
- Azure CLI
- DNS CNAME and Azure DNS alias records
- Azure CDN rules engine

## Sources Consulted
- Microsoft Learn: Comparison between Azure Front Door and Azure Content Delivery Network - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-cdn-comparison
- Microsoft Learn: Azure CLI `az cdn custom-domain` reference - https://learn.microsoft.com/en-us/cli/azure/cdn/custom-domain
- Microsoft Learn: Azure CLI `az cdn endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint
- Microsoft Learn: Azure CLI `az cdn endpoint rule` reference - https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint/rule
- Microsoft Learn: Azure DNS alias records overview - https://learn.microsoft.com/en-us/azure/dns/dns-alias
- Microsoft Learn: Azure CLI `az network dns record-set a` reference - https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set/a

## Issues Found
- The post is built around creating an Azure CDN Standard from Microsoft profile with `--sku Standard_Microsoft` and enabling a CDN-managed certificate. Microsoft now documents this as a classic tier path: as of August 15, 2025, Azure CDN from Microsoft classic no longer supports new domain onboarding or profile creation, and no longer supports managed certificates. Existing managed certificates remained valid only until April 14, 2026. Since this review is dated June 1, 2026, the primary workflow in the post is no longer valid for new deployments.
- The post says the Microsoft Standard tier supports managed certificates. That is no longer correct for new or active managed-certificate use on Azure CDN Standard from Microsoft classic after the documented cutoff dates.
- The post's status-check command queries only `customHttpsParameters.certificateSource`, which would not show the actual HTTPS provisioning lifecycle state described in the text.
- The cache rule uses `--cache-duration "7.00:00:00"`. Current Azure CLI documentation for `az cdn endpoint rule add` describes the accepted cache duration format as `hh:mm:ss.xxxxxx`, while SDK and ARM references also show `[d.]hh:mm:ss`. This is a version-sensitive caveat, but it is secondary to the retirement issue.

## Review Notes
The technically correct path for a new managed-certificate CDN-style deployment is Azure Front Door Standard or Premium, not this Azure CDN Standard from Microsoft classic workflow. Reworking the article would require a substantial replacement of the profile, endpoint, origin, route, custom domain, and certificate commands with `az afd` equivalents, so this post should be removed or replaced rather than lightly patched.
