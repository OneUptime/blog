# Validation Summary: How to Configure Cloudflare Rate Limiting with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform HCL
- Cloudflare Ruleset Engine
- Cloudflare rate limiting rules
- Cloudflare WAF custom rules

## Sources Consulted
- Cloudflare Terraform docs: Rate limiting rules configuration using Terraform - https://developers.cloudflare.com/terraform/additional-configurations/rate-limiting-rules/
- Cloudflare WAF docs: Rate limiting parameters - https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/
- Cloudflare WAF docs: Request rate calculation - https://developers.cloudflare.com/waf/rate-limiting-rules/request-rate/
- Cloudflare Terraform docs: WAF custom rules configuration using Terraform - https://developers.cloudflare.com/terraform/additional-configurations/waf-custom-rules/
- Cloudflare WAF docs: Available skip options - https://developers.cloudflare.com/waf/custom-rules/skip/options/
- Cloudflare WAF docs: API examples of custom rules with the Skip action - https://developers.cloudflare.com/waf/custom-rules/skip/api-examples/
- Cloudflare WAF docs: Rate limiting (previous version) upgrade - https://developers.cloudflare.com/waf/reference/migration-guides/old-rate-limiting-deprecation/

## Issues Found
- The post described modern Cloudflare rate limiting as WAF Custom Rules. I corrected this to use rulesets in the `http_ratelimit` phase, which is the current Ruleset Engine model.
- The login example used `requests_to_origin = true` with a comment claiming it counted failed login attempts. That setting only affects whether cached traffic is counted. I replaced it with a `counting_expression` that counts only `401` and `403` login responses.
- Two rate limiting rules omitted `cf.colo.id` from `characteristics`. Cloudflare requires `cf.colo.id` in API/Terraform rate limiting configurations, so I added it to every rule.
- The custom JSON 429 response was implemented as a separate `http_custom_errors` ruleset with `expression = "true"`, which would not be scoped specifically to rate limiting. I replaced that snippet with the documented `action_parameters.response` block added directly to a rate limiting rule.
- The allowlist example used the `http_request_firewall_managed` phase and `ruleset = "current"`, which would not skip rate limiting. I changed it to a zone-level custom rule in `http_request_firewall_custom` with `action_parameters.phases = ["http_ratelimit"]`.
- The best-practices guidance about shared NAT IPs and `mitigation_timeout` was inaccurate. I updated it to reference `cf.unique_visitor_id` for NAT-aware tracking and documented Cloudflare's actual `mitigation_timeout` behavior, including `0` for throttling over-limit requests only.
- The provider version pin was updated from `~> 4.23` to `~> 4.43` to align the post with Cloudflare's current documented Terraform v4 examples.

## Review Notes
- The post correctly uses `cloudflare_ruleset`, which is the supported Terraform resource for Cloudflare's current rate limiting implementation. The legacy `cloudflare_rate_limit` resource is deprecated and unsupported as of 2025-06-15.
- Cloudflare allows at most one entry point ruleset per phase at the zone level. If additional `http_ratelimit` or `http_request_firewall_custom` rules are added later, they should be added to the existing ruleset resource for that phase rather than created as another entry point resource.
