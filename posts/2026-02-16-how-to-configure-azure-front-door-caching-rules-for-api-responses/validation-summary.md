# Validation Summary: How to Configure Azure Front Door Caching Rules for API Responses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure CLI
- Front Door rule sets and delivery rules
- Edge caching and cache purging
- HTTP Cache-Control headers

## Sources Consulted
- Microsoft Learn: Azure Front Door caching - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching
- Microsoft Learn: Azure CLI `az afd route` - https://learn.microsoft.com/en-us/cli/azure/afd/route
- Microsoft Learn: Azure CLI `az afd rule` - https://learn.microsoft.com/en-us/cli/azure/afd/rule
- Microsoft Learn: Azure CLI `az afd endpoint purge` - https://learn.microsoft.com/en-us/cli/azure/afd/endpoint
- Microsoft Learn: Azure Front Door rule set actions - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-rules-engine-actions
- Microsoft Learn: Azure Front Door rules match conditions - https://learn.microsoft.com/en-us/azure/frontdoor/rules-match-conditions
- Microsoft Learn: Azure Front Door Standard/Premium rules REST API definitions - https://learn.microsoft.com/en-us/rest/api/frontdoorservice/azurefrontdoorstandardpremium/rules/get

## Issues Found
- The rule set was created but not associated with the route, so the delivery rules would not affect the API route. Added an `az afd route update --rule-sets apiCacheRules` command after rule-set creation.
- The sensitive-endpoint bypass rule used `--order 0`. Azure CLI documentation states rule order `0` is special and its actions are always applied, so this could bypass caching more broadly than intended. Changed it to the lowest nonzero order and shifted the endpoint-specific cache rules accordingly.
- Rules default to continuing evaluation, which could allow later caching rules to override earlier endpoint-specific rules. Added `--match-processing-behavior Stop` to the bypass and specific cache rules.
- The origin-header example used `HonorOrigin` with the `CacheExpiration` action. REST API definitions list `HonorOrigin` under route configuration override cache behavior, so the example now uses `RouteConfigurationOverride` with caching enabled.
- The cache-key customization example claimed to vary by the `Accept-Language` request header, but the command used `CacheKeyQueryString`, which varies cache keys by query string. Updated the example to vary by an explicit `language` query parameter.

## Review Notes
The environment did not have the Azure CLI installed, so command verification was performed against Microsoft Learn CLI and REST API documentation rather than local `az --help` output. The caching behavior claims about GET-only caching, query string handling, purge path formats, `Cache-Control` precedence, and `X-Cache` header values matched Microsoft documentation.
