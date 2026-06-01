# Validation Summary: How to Set Up Azure CDN with Rules Engine for URL Rewrite

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure CDN Standard from Microsoft
- Azure CDN Rules Engine delivery rules
- Azure Front Door Standard and Premium rule sets
- Azure CLI
- URL rewrite and URL redirect rules

## Sources Consulted
- Microsoft Learn: Azure CLI `az cdn endpoint rule` reference, https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint/rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az cdn endpoint rule condition` reference, https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint/rule/condition?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az cdn endpoint` reference, https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint?view=azure-cli-latest
- Microsoft Learn: Actions in the Standard rules engine for Azure CDN, https://learn.microsoft.com/en-us/azure/cdn/cdn-standard-rules-engine-actions
- Microsoft Learn: Match conditions in the Standard rules engine for Azure CDN, https://learn.microsoft.com/en-us/azure/cdn/cdn-standard-rules-engine-match-conditions
- Microsoft Learn: Azure CLI `az afd rule` reference, https://learn.microsoft.com/en-us/cli/azure/afd/rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az afd rule-set` reference, https://learn.microsoft.com/en-us/cli/azure/afd/rule-set?view=azure-cli-latest
- Microsoft Learn: Azure Front Door URL rewrite, https://learn.microsoft.com/en-us/azure/frontdoor/front-door-url-rewrite
- Microsoft Learn: Azure Front Door rule set server variables, https://learn.microsoft.com/en-us/azure/frontdoor/rule-set-server-variables

## Issues Found
- The post showed creating a new Azure CDN Standard from Microsoft profile. Microsoft documents this as a classic service with new profile creation, new domain onboarding, and managed certificates disabled, and retirement scheduled for September 30, 2027. I changed the setup section to assume an existing Standard Microsoft profile and recommend Azure Front Door Standard or Premium for new deployments.
- The Standard CDN rewrite examples used regex capture groups and `$1` substitutions. Microsoft documents the URL rewrite source pattern as the path pattern to replace, with unmatched path preservation for suffix handling. I changed the clean URL and API examples to prefix-based rewrites using `--preserve-unmatched-path true`.
- The API versioning example used a negative-lookahead pattern that is not supported by the Standard CDN rule syntax. I changed it to a stable `/api/current/` alias that rewrites to `/api/v3/`.
- The redirect example attempted dynamic path substitution with `{url_path.1}`, which is not listed in the Standard CDN redirect action fields. Azure Front Door supports server variables with a different syntax, so I changed the CDN redirect example to a static `/blog/` target.
- The multiple-condition example claimed HTTPS GET targeting but only configured a path condition. I added `az cdn endpoint rule condition add` commands for `RequestScheme` and `RequestMethod`.
- The Azure Front Door example used `RouteConfigurationOverride` with URL rewrite parameters. I changed the action to `UrlRewrite`, which matches the documented CLI parameters.
- The performance section claimed microsecond latency and made an overly specific cache-key statement that was not supported by the consulted docs. I softened those statements to avoid unsupported precision.

## Review Notes
The Azure CLI was not installed in the local workspace, so command validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
