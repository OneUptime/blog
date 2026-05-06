# Validation Summary: How to Cloudflare Waf Rules with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Cloudflare provider (`cloudflare/cloudflare`)
- Cloudflare WAF custom rules
- Cloudflare Ruleset Engine
- HCL

## Sources Consulted
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- Cloudflare Terraform Provider overview: https://developers.cloudflare.com/api/terraform/
- Cloudflare Terraform docs, WAF custom rules configuration using Terraform: https://developers.cloudflare.com/terraform/additional-configurations/waf-custom-rules/
- Cloudflare WAF custom rules overview: https://developers.cloudflare.com/waf/custom-rules/
- Cloudflare WAF migration guide for deprecated firewall rules resources: https://developers.cloudflare.com/waf/reference/legacy/firewall-rules-upgrade/
- Cloudflare Terraform docs, Rule IDs change when I modify a ruleset: https://developers.cloudflare.com/terraform/troubleshooting/rule-id-changes/
- Terraform Registry API for `cloudflare/cloudflare`: https://registry.terraform.io/v1/providers/cloudflare/cloudflare
- Cloudflare provider source docs for `cloudflare_ruleset` v5.19.1: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/v5.19.1/docs/resources/ruleset.md

## Issues Found
- The post described a nonexistent "Cloudflare Waf Rules provider" and used placeholder provider metadata. I replaced it with the real `cloudflare/cloudflare` provider and a current `~> 5.19` version constraint, which matches the provider's published 5.19.1 release line as of 2026-05-06.
- The authentication example used fake `PROVIDER_API_KEY` and `PROVIDER_API_SECRET` environment variables. I updated it to Cloudflare's documented `CLOUDFLARE_API_TOKEN` flow and noted the required `Zone WAF Write` scope for zone-level custom rules.
- The resource example used a fake provider resource that would not work. I replaced it with a real `cloudflare_ruleset` example for the `http_request_firewall_custom` phase, including the correct `kind`, `phase`, `rules`, and `ref` fields.
- The variables and outputs no longer matched the corrected resource after replacing the placeholder example. I updated them to use `zone_id` and the ruleset ID output.
- The introduction and conclusion implied a dedicated WAF-rules provider/resource model. I corrected the wording to reflect Cloudflare's current Ruleset Engine model for WAF custom rules.
- The best-practices section was too generic for Cloudflare rulesets. I updated it to cover scoped tokens, `.terraform.lock.hcl`, and stable `ref` values for preserving rule IDs across ruleset updates.

## Review Notes
- As of 2026-05-06, the Terraform Registry API reports `cloudflare/cloudflare` version `5.19.1` as the latest stable release. The post now uses `~> 5.19` to stay on that current minor line while allowing patch updates.
- Cloudflare deprecated the legacy `cloudflare_firewall_rule` and `cloudflare_filter` resources on 2025-06-15; new WAF custom rule configuration should use `cloudflare_ruleset`.
- I did not run `tofu init` or `tofu validate`, because neither `tofu` nor `terraform` is installed in this review environment. The review was completed against official documentation and the provider's published schema.
