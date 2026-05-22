# Validation Summary: How to Use the Cloudflare Provider for DNS and CDN in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Cloudflare Terraform provider
- Cloudflare DNS
- Cloudflare zone settings
- Cloudflare Page Rules
- Cloudflare WAF custom rules / Rulesets

## Sources Consulted
- Cloudflare Terraform provider overview: https://developers.cloudflare.com/terraform/
- Cloudflare Terraform DNS resource documentation: https://developers.cloudflare.com/api/terraform/resources/dns
- Cloudflare Terraform zone settings documentation: https://developers.cloudflare.com/api/terraform/resources/zones/
- Cloudflare Terraform HTTPS settings tutorial: https://developers.cloudflare.com/terraform/tutorial/configure-https-settings/
- Cloudflare Terraform WAF custom rules documentation: https://developers.cloudflare.com/terraform/additional-configurations/waf-custom-rules/
- Cloudflare Firewall Rules upgrade/deprecation documentation: https://developers.cloudflare.com/waf/reference/legacy/firewall-rules-upgrade/
- Cloudflare Terraform Page Rules resource documentation: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/page_rule
- Cloudflare DNS TTL documentation: https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/
- Cloudflare Ruleset Engine field reference for `cf.threat_score` and `cf.client.bot`: https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/

## Issues Found
- The provider version was pinned to `~> 4.0`, which keeps readers on the v4 provider even though the current provider documentation uses v5. Updated the provider constraint to `~> 5.0`.
- DNS examples used the v4 `cloudflare_record` resource and `hostname` output attribute. Updated them to the v5 `cloudflare_dns_record` resource and `name` output attribute.
- Zone settings examples used `cloudflare_zone_settings_override`, which is replaced in v5 by individual `cloudflare_zone_setting` resources. Updated the settings examples accordingly.
- The SSL/TLS example used `tls_1_3 = "zrt"` inside `cloudflare_zone_settings_override`. Updated it to v5 `cloudflare_zone_setting` resources for `tls_1_3` and `0rtt`.
- The firewall example used deprecated and unsupported `cloudflare_filter` and `cloudflare_firewall_rule` resources. Replaced it with a `cloudflare_ruleset` example for the `http_request_firewall_custom` phase.
- The original firewall expression blocked `cf.client.bot`, which represents known good/verified bots, despite the description saying bad bots. Updated the custom rule to block high threat score requests while excluding verified bots.
- Page Rules examples used the older action block syntax. Updated them to the v5 `actions = { ... }` attribute syntax.

## Review Notes
- Some Cloudflare zone settings are plan-dependent; attempting to manage unavailable settings can fail for lower-tier zones.
- Page Rules remain supported in the provider, but Cloudflare generally recommends newer Rules products such as Cache Rules and Configuration Rules for new designs where applicable.
