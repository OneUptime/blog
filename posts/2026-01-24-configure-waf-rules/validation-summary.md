# Validation Summary: How to Configure WAF Rules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS WAF and AWS WAFv2 Web ACLs
- Terraform AWS provider WAFv2 resources
- ModSecurity with NGINX
- OWASP Core Rule Set
- Cloudflare WAF custom rules and rate limiting rules
- Python requests-based WAF testing

## Sources Consulted
- AWS WAF API Reference: ManagedRuleGroupStatement and RuleActionOverride: https://docs.aws.amazon.com/waf/latest/APIReference/API_ManagedRuleGroupStatement.html
- AWS WAF Developer Guide: overriding rule group actions: https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-rule-group-override-options.html
- AWS WAF API Reference: FieldToMatch, Body, RateBasedStatement, and WebACL update validation: https://docs.aws.amazon.com/waf/latest/APIReference/API_FieldToMatch.html
- AWS WAF Developer Guide: rate-based rule settings: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
- Terraform AWS provider documentation for aws_wafv2_web_acl: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- ModSecurity v3 reference manual: https://github.com/owasp-modsecurity/ModSecurity/wiki/Reference-Manual-%28v3.x%29
- OWASP CRS 4.25.0 crs-setup.conf.example: https://raw.githubusercontent.com/coreruleset/coreruleset/v4.25.0/crs-setup.conf.example
- OWASP CRS documentation: https://coreruleset.org/docs/
- Cloudflare Ruleset Engine JSON object documentation: https://developers.cloudflare.com/ruleset-engine/rulesets-api/json-object/
- Cloudflare WAF rate limiting rules API documentation: https://developers.cloudflare.com/waf/rate-limiting-rules/create-api/
- Cloudflare WAF rate limiting parameters: https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/
- Cloudflare Rules language fields for cf.client.bot and verified bot categories: https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/

## Issues Found
- Replaced deprecated/incorrect AWS WAF `ExcludedRules` usage with `RuleActionOverrides` using a `Count` action for `SizeRestrictions_BODY`, matching current AWS WAFv2 rule override guidance.
- Added `oversize_handling = "CONTINUE"` to the Terraform `body` field inspection example so AWS WAF body inspection has explicit oversize handling.
- Updated the OWASP CRS setup snippet for current CRS 4.x variables: `tx.blocking_paranoia_level` and `tx.detection_paranoia_level` replace the older `tx.paranoia_level` usage.
- Removed invalid CRS attack-category toggles such as `tx.do_sqli_check`; current CRS enables attack detection through included rule files and paranoia levels, not those variables.
- Corrected CRS setup rule IDs and the allowed content type format to match the current `crs-setup.conf.example`.
- Added `initcol:ip=%{REMOTE_ADDR}` before ModSecurity IP collection rate-limit counters so the persistent IP collection exists before `setvar:ip.login_counter` is used.
- Corrected Cloudflare Rulesets examples by using user-defined `ref` fields instead of read-only `id` values.
- Split Cloudflare custom WAF rules and rate limiting rules into separate ruleset phases, and changed the rate limiting example to use `action: "block"` plus a `ratelimit` object with mandatory `cf.colo.id` in `characteristics`.
- Replaced the Cloudflare `cf.client.bot` "bad bot" expression because `cf.client.bot` identifies known good bots; the corrected example uses Bot Management score fields for likely automated traffic.

## Review Notes
The Cloudflare Bot Management fields used in the custom rule example are plan-dependent. The Python test script is syntactically valid, but its expected status codes are illustrative and depend on the deployed WAF, rule order, managed rule versions, and application behavior.
