# Validation Summary: How to Configure Azure CDN Caching Rules for Maximum Application Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure CDN Standard from Microsoft (classic)
- Azure Front Door
- Azure CDN rules engine
- Azure CLI
- HTTP caching and Cache-Control headers
- Express.js static file middleware

## Sources Consulted
- Microsoft Learn: Azure CDN Standard rules engine actions - https://learn.microsoft.com/en-us/azure/cdn/cdn-standard-rules-engine-actions
- Microsoft Learn: Azure CDN Standard rules engine match conditions - https://learn.microsoft.com/en-us/azure/cdn/cdn-standard-rules-engine-match-conditions
- Microsoft Learn: Azure CLI `az cdn endpoint rule` - https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint/rule
- Microsoft Learn: Azure CLI `az cdn endpoint` - https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint
- Microsoft Learn: Azure CDN endpoint ARM/Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/profiles/endpoints
- Microsoft Learn: Azure CDN purge content REST API - https://learn.microsoft.com/en-us/rest/api/cdn/endpoints/purge-content
- Microsoft Learn: Azure Front Door and Azure CDN comparison / retirement information - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-cdn-comparison
- Microsoft Learn: Azure Front Door caching behavior and `X-Cache` values - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching
- Express.js serve-static middleware documentation - https://expressjs.com/en/resources/middleware/serve-static.html

## Issues Found
- The post described retired CDN provider SKUs as current options. Updated the profile list to note Azure CDN Standard from Akamai retired in 2023, Azure CDN Standard/Premium from Edgio formerly Verizon retired in 2025, and Azure CDN Standard from Microsoft (classic) is on a retirement path with new profile creation no longer supported.
- The post said the guide focused on Azure CDN Standard from Microsoft because it is the most commonly used. Changed this to focus on existing Azure CDN Standard from Microsoft (classic) profiles and recommend Azure Front Door Standard/Premium for new deployments.
- The global cache rule CLI example used a conditional rule with `--order 1` and a request URI condition. Updated it to use `--order 0`, which is the documented global rule order that does not require conditions.
- The global cache rule CLI example used a day-based duration string. Updated the CLI example to `168:00:00`, matching the Azure CLI documented duration format for `--cache-duration`.
- The post said `Override` ignores origin cache headers unconditionally. Updated the wording to reflect Microsoft documentation: the cache expiration action applies only when the response is cacheable, and `no-cache`, `private`, and `no-store` responses are not overridden.
- The delivery policy JSON omitted required `typeName` fields for delivery rule action and match condition parameters. Added the required `typeName` values and clarified that the snippet is a delivery policy fragment.
- The query string section claimed `UseQueryString` was the default. Removed the default claim and described the behavior as applying when the endpoint is configured with `UseQueryString`.
- The Express.js `immutable` comment said it tells the CDN content will never change. Updated it to match Express documentation: it adds the `immutable` Cache-Control directive so supported caches do not revalidate while `maxAge` is fresh.

## Review Notes
- Azure CLI was not installed in the local workspace, so CLI verification used current Microsoft Learn command reference documentation instead of local `az --help` output.
- The `X-Cache` examples are consistent with Microsoft documentation for Azure Front Door and commonly observed Microsoft CDN behavior, but exact diagnostic headers can vary by CDN product tier.
