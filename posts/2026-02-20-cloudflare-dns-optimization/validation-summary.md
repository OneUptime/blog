# Validation Summary: How to Optimize DNS and CDN with Cloudflare

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cloudflare DNS
- Cloudflare CDN and Cache Rules
- Cloudflare Page Rules
- Cloudflare WAF custom rules
- Cloudflare zone settings
- Cloudflare rate limiting rules
- Cloudflare Analytics
- OneUptime monitoring

## Sources Consulted
- Cloudflare DNS Records API: https://developers.cloudflare.com/api/resources/dns/subresources/records/
- Cloudflare DNS TTL documentation: https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/
- Cloudflare Cache Rules API documentation: https://developers.cloudflare.com/cache/how-to/cache-rules/create-api/
- Cloudflare Cache Rules settings documentation: https://developers.cloudflare.com/cache/how-to/cache-rules/settings/
- Cloudflare Page Rules documentation: https://developers.cloudflare.com/rules/page-rules/
- Cloudflare Page Rules API documentation: https://developers.cloudflare.com/api/resources/page_rules/
- Cloudflare Page Rules wildcard matching documentation: https://developers.cloudflare.com/rules/page-rules/reference/wildcard-matching/
- Cloudflare WAF custom rules API documentation: https://developers.cloudflare.com/waf/custom-rules/create-api/
- Cloudflare WAF phases documentation: https://developers.cloudflare.com/waf/reference/phases/
- Cloudflare rate limiting rules API documentation: https://developers.cloudflare.com/waf/rate-limiting-rules/create-api/
- Cloudflare rate limiting parameters documentation: https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/
- Cloudflare HTTP/3 documentation: https://developers.cloudflare.com/speed/optimization/protocol/http3/
- Cloudflare Early Hints documentation: https://developers.cloudflare.com/cache/advanced-configuration/early-hints/
- Cloudflare API deprecations documentation: https://developers.cloudflare.com/fundamentals/api/reference/deprecations/

## Issues Found
- The post recommended enabling Auto Minify via the zone settings API. Cloudflare's documentation now marks Auto Minify and its API endpoints as deprecated, so the example was changed to turn Auto Minify off if it is still enabled.
- The rate limiting example used only `ip.src` as a characteristic. Cloudflare's rate limiting API documentation lists `cf.colo.id` as a mandatory characteristic, so the example now uses `["cf.colo.id", "ip.src"]`.
- The DNS performance diagram labeled a cache hit as `0ms`. A cache hit still has network and edge processing latency, so the label was changed to `Edge response` to avoid an inaccurate absolute latency claim.

## Review Notes
- The Rulesets API examples create phase entry point rulesets directly, which is valid when the corresponding entry point ruleset does not already exist. In an existing Cloudflare zone with an entry point ruleset already present, users should fetch the ruleset ID and add or update rules instead.
- Page Rules remain available, but Cloudflare documentation recommends considering newer Rules products for more granular configurations.
