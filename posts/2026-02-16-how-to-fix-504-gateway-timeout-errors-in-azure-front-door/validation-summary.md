# Validation Summary: How to Fix '504 Gateway Timeout' Errors in Azure Front Door

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure Front Door classic
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics / Kusto Query Language
- Azure Front Door health probes
- Azure Private Link
- Network Security Groups and Azure service tags
- Nginx keep-alive and proxy timeout configuration

## Sources Consulted
- Microsoft Learn: How to configure an origin for Azure Front Door - https://learn.microsoft.com/en-gb/azure/frontdoor/how-to-configure-origin
- Microsoft Learn: Troubleshoot Azure Front Door common issues - https://learn.microsoft.com/en-us/troubleshoot/azure/front-door/troubleshoot-issues
- Microsoft Learn: Azure Front Door health probes - https://learn.microsoft.com/en-us/azure/frontdoor/health-probes
- Microsoft Learn: Azure Front Door service limits, timeout values, and upload/download data limits - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits#azure-front-door-standard-and-premium-service-limits
- Microsoft Learn: Monitor Azure Front Door - https://learn.microsoft.com/en-us/azure/frontdoor/monitor-front-door
- Microsoft Learn: Azure Front Door monitoring data reference - https://learn.microsoft.com/en-us/azure/frontdoor/monitor-front-door-reference
- Microsoft Learn: Azure CLI `az afd profile` reference - https://learn.microsoft.com/en-us/cli/azure/afd/profile
- Microsoft Learn: Azure CLI `az afd route` reference - https://learn.microsoft.com/en-us/cli/azure/afd/route
- Microsoft Learn: Azure CLI `az network front-door` reference - https://learn.microsoft.com/en-us/cli/azure/network/front-door
- Microsoft Learn: Azure CLI `az network front-door backend-pool` reference - https://learn.microsoft.com/en-us/cli/azure/network/front-door/backend-pool
- Microsoft Learn: Secure traffic to Azure Front Door origins - https://learn.microsoft.com/en-us/azure/frontdoor/origin-security
- Microsoft Learn: Secure your origin with Private Link in Azure Front Door Premium - https://learn.microsoft.com/en-us/azure/frontdoor/private-link
- Microsoft Learn: Azure service tags overview - https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview

## Issues Found
- The Standard/Premium timeout update command used `az afd route update --origin-response-timeout-seconds`, but Azure CLI exposes `--origin-response-timeout-seconds` on `az afd profile update`. Updated the command and comment because the timeout is profile-level.
- The health probe example described `az network front-door backend-pool show` as showing health probe results. The CLI reference says this command returns backend pool details, not live health status. Updated the wording and comment to describe it as backend pool configuration tied to the health probe.
- The diagnostic logging section referenced `originResponseTime_s`, which is not part of the documented Azure Front Door access-log schema. Updated the query to use documented access-log fields such as status code, origin name, `timeTaken_s`, and `errorInfo_s`, and clarified that Origin Latency is the metric to use for origin-specific timing.
- The request body size limits were oversimplified. Updated the upload limit text to match Microsoft documentation: uploads without HTTP chunking cannot exceed 2 GB, while chunked transfer encoding has no overall upload limit as long as each CTE upload is less than 2 GB.

## Review Notes
Azure Front Door classic is still technically covered by Microsoft documentation but is scheduled for retirement on March 31, 2027. Future revisions should consider emphasizing migration to Standard/Premium more strongly.
