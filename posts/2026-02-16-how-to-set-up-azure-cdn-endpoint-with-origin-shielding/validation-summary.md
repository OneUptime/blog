# Validation Summary: How to Set Up Azure CDN Endpoint with Origin Shielding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure CDN / Front Door caching
- Origin shielding / parent cache POPs
- Azure CLI
- Azure Monitor metrics
- Azure Front Door access logs and Kusto queries

## Sources Consulted
- Microsoft Learn: Azure Front Door and CDN service comparison: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-cdn-comparison
- Microsoft Learn: Quickstart: Create an Azure Front Door using Azure CLI: https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-cli
- Microsoft Learn: Azure Front Door origins and origin groups: https://learn.microsoft.com/en-us/azure/frontdoor/origin
- Microsoft Learn: Azure Front Door caching: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching
- Microsoft Learn: Monitor Azure Front Door: https://learn.microsoft.com/en-us/azure/frontdoor/monitor-front-door
- Microsoft Learn: az afd origin CLI reference: https://learn.microsoft.com/en-us/cli/azure/afd/origin
- Microsoft Learn: az afd origin-group CLI reference: https://learn.microsoft.com/en-us/cli/azure/afd/origin-group
- Microsoft Learn: az afd route CLI reference: https://learn.microsoft.com/en-us/cli/azure/afd/route
- Microsoft Learn: az cdn origin CLI reference: https://learn.microsoft.com/en-us/cli/azure/cdn/origin
- Microsoft Learn: az cdn endpoint rule CLI reference: https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint/rule

## Issues Found
- The post claimed Azure CDN Standard from Microsoft could be created and configured for origin shielding with `az cdn` commands. Azure CDN Standard from Microsoft is now a classic tier with new profile creation blocked, and the shown `az cdn origin update` command did not enable origin shielding. Updated the guide to use Azure Front Door Standard/Premium.
- The post described origin shielding as a manually enabled feature with a chosen shield region. Microsoft documentation describes Azure Front Door origin shield as parent cache POP behavior visible in access logs; there is no user-facing shield-region setting. Reworked the setup, region guidance, limitations, and summary accordingly.
- The Front Door examples used `az afd origin update` and `az afd origin-group update` as if those commands enabled origin shielding. Those commands configure origin properties and origin-group health/load-balancing settings. Updated the text to make caching the relevant configuration and to describe origin-group settings accurately.
- The CDN rules example used a cache duration format of `7.00:00:00`, while the Azure CLI reference for `az cdn endpoint rule add` documents `hh:mm:ss.xxxxxx`. Replaced the example with supported Azure Front Door route caching commands and guidance to use origin `Cache-Control` TTLs.
- Monitoring guidance only used `RequestCount` and generic cache hit language. Added the documented Front Door access-log field `isReceivedFromClient` and cache status grouping so readers can distinguish client-facing edge entries from origin shield entries.
- The post said egress from shield POPs to edge POPs adds extra data transfer cost. Microsoft documentation states charges are not incurred for egress from origin shield to edge nodes. Removed that cost claim.

## Review Notes
The local environment did not have the Azure CLI installed, so command validation was performed against current Microsoft Learn CLI references and Azure Front Door product documentation.
