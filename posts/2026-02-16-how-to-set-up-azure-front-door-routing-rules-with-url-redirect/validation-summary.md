# Validation Summary: How to Set Up Azure Front Door Routing Rules with URL Redirect

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure Front Door rule sets and delivery rules
- Azure CLI
- URL redirects and HTTP redirect status codes
- curl

## Sources Consulted
- Microsoft Learn: URL redirect in Azure Front Door, https://learn.microsoft.com/en-us/azure/frontdoor/front-door-url-redirect
- Microsoft Learn: Azure Front Door rule set server variables, https://learn.microsoft.com/en-us/azure/frontdoor/rule-set-server-variables
- Microsoft Learn: Azure Front Door rules match conditions, https://learn.microsoft.com/en-us/azure/frontdoor/rules-match-conditions
- Microsoft Learn: Azure Front Door rule sets overview, https://learn.microsoft.com/en-us/azure/frontdoor/front-door-rules-engine
- Microsoft Learn: Azure CLI `az afd rule`, https://learn.microsoft.com/en-us/cli/azure/afd/rule
- Microsoft Learn: Azure CLI `az afd route`, https://learn.microsoft.com/en-us/cli/azure/afd/route
- Microsoft Learn: Add delivery rules to Azure Front Door with Azure CLI, https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/front-door-add-rules-cli

## Issues Found
- Fixed incorrect Azure CLI option names in redirect examples. The post used `--custom-host` and `--custom-query-string`, but the current `az afd rule create` options are `--custom-hostname` and `--custom-querystring`.
- Fixed the domain match condition to use the Front Door `HostName` condition instead of matching the `Host` request header through `RequestHeader`.
- Fixed URL path match values by removing leading slashes. Azure Front Door URL path match values are based on the path without the leading `/`.
- Added `--match-processing-behavior Stop` to redirect rules and updated the rule-ordering explanation. Azure CLI defaults match processing behavior to `Continue`, so the original "first matching rule wins" statement was not accurate as written.
- Corrected path redirect guidance. URL redirect can use Front Door server variables such as `{url_path:seg#}` for dynamic path construction, so the original claim that prefix replacement required URL rewrite was too broad.
- Updated the route association example to link the default endpoint domain and set forwarding/HTTPS redirect behavior explicitly, so the later `myEndpoint.azurefd.net` curl test is consistent with the route.
- Corrected the curl expected `Location` header. With the domain redirect rule stopping before the path redirect rule, `/blog` redirects to `https://new-domain.com/blog`, not `https://new-domain.com/articles`.
- Removed wording that described URL redirects as "path rewrites" to avoid conflating Front Door URL redirect and URL rewrite actions.

## Review Notes
The local environment did not have Azure CLI installed, so CLI verification was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
