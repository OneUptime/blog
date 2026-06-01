# Validation Summary: How to Configure Azure CDN with Geo-Filtering to Restrict Content by Country

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure CDN
- Azure CDN geo-filtering
- Azure CLI
- Bicep
- Azure Monitor diagnostic settings

## Sources Consulted
- Microsoft Learn: Azure CDN geo-filtering overview and portal behavior, https://learn.microsoft.com/en-us/azure/cdn/cdn-restrict-access-by-country
- Microsoft Learn: Azure CLI `az cdn endpoint` reference, including `--geo-filters`, https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint
- Microsoft Learn: Azure CDN delivery rule CLI reference, https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint/rule
- Microsoft Learn: ARM/Bicep resource schema for `Microsoft.Cdn/profiles/endpoints`, including `geoFilters`, https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/profiles/endpoints
- Microsoft Learn: Azure Monitor diagnostic settings CLI reference, https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Azure: Azure CDN pricing page, including Azure CDN Standard from Microsoft (classic) retirement notice, https://azure.microsoft.com/en-us/pricing/details/cdn/
- Microsoft Learn: Migrate Azure CDN from Edgio to Azure Front Door, https://learn.microsoft.com/en-us/azure/frontdoor/migrate-cdn-to-front-door
- Microsoft Azure SDK Blog: `azd` CDN changing January 2025, https://devblogs.microsoft.com/azure-sdk/azd-cdn-changing-january-2025/

## Issues Found
- The Azure CLI examples used `az cdn endpoint rule add` with `RemoteAddress`, `GeoMatch`, and `--action-name Block`. That command manages delivery rules, not endpoint `geoFilters`, and its documented actions do not include a generic `Block` action. Replaced the examples with `az cdn endpoint update --geo-filters` using the documented `relativePath`, `action`, and `countryCodes` shape.
- The "allow only these countries" CLI example used `--negate-condition true` with a block action. Replaced it with a direct geo-filter `Allow` action, which is the documented geo-filter behavior.
- The path-specific CLI example attempted to combine URI and GeoMatch delivery-rule conditions in one `az cdn endpoint rule add` command. Replaced it with a path-specific geo-filter entry using `relativePath`.
- The prerequisites and CDN tier section listed Standard Verizon and Premium Verizon as available Azure CDN options. Azure CDN from Edgio, formerly Verizon, was retired on January 15, 2025. Updated the wording to cover Azure CDN Standard from Microsoft (classic), its September 30, 2027 retirement date, and Azure Front Door as Microsoft's recommended modern CDN platform.
- Added a note that `--geo-filters` sets the endpoint's geo-filter list, so existing geo-filter rules must be included if they should remain.

## Review Notes
The Bicep `geoFilters` structure and diagnostic settings command format are consistent with Microsoft documentation. Azure CDN Standard from Microsoft is now a classic product with a published retirement date, so future posts should consider Azure Front Door Standard or Premium for new deployments.
