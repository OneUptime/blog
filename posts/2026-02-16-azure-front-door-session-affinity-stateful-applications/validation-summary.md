# Validation Summary: How to Set Up Azure Front Door with Session Affinity for Stateful Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure Front Door origin groups, origins, and routes
- Azure Front Door session affinity
- Azure CLI
- Azure Monitor diagnostic settings and access logs
- HTTP cookies and caching behavior

## Sources Consulted
- Microsoft Learn: Traffic routing methods to origin - Azure Front Door, https://learn.microsoft.com/en-us/azure/frontdoor/routing-methods
- Microsoft Learn: Routing architecture overview - Azure Front Door, https://learn.microsoft.com/en-us/azure/frontdoor/front-door-routing-architecture
- Microsoft Learn: Origins and origin groups - Azure Front Door, https://learn.microsoft.com/en-us/azure/frontdoor/origin
- Microsoft Learn: Azure CLI `az afd origin-group`, https://learn.microsoft.com/en-us/cli/azure/afd/origin-group
- Microsoft Learn: Azure CLI `az afd origin`, https://learn.microsoft.com/en-us/cli/azure/afd/origin
- Microsoft Learn: Azure CLI `az afd route`, https://learn.microsoft.com/en-us/cli/azure/afd/route
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings`, https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Monitor Azure Front Door, https://learn.microsoft.com/en-us/azure/frontdoor/monitor-front-door
- Microsoft Learn: Configure Azure Front Door logs, https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-logs

## Issues Found
- The post identified the Azure Front Door session affinity cookie as `AFDID`. Current Azure Front Door Standard/Premium documentation says Front Door sets `ASLBSA` and `ASLBSACORS` cookies for session affinity. Updated the explanation, Mermaid diagram, verification command, backend failure note, and cookie lifetime note accordingly.
- The route creation commands omitted `--link-to-default-domain Enabled`, while the verification step uses the generated `*.azurefd.net` endpoint hostname. Azure CLI documentation shows the default route domain link is disabled unless enabled. Added `--link-to-default-domain Enabled` to the route examples.
- The monitoring guidance suggested confirming affinity by checking that the same client IP consistently hits the same origin. Because session affinity is cookie-based and multiple users can share an IP address, this is not a reliable validation method. Updated the note to check requests carrying the same session affinity cookies against the logged backend hostname.
- The caching discussion omitted an important documented behavior: Front Door does not establish session affinity when the origin sends a cacheable response. Added this caveat to the CDN caching interaction note.

## Review Notes
- Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
- The post correctly uses Azure Front Door Standard/Premium origin group-level session affinity. Azure Front Door classic is retiring on March 31, 2027, but the tutorial uses Standard tier commands.
