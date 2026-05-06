# Validation Summary: How to Manage Cloudflare DNS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Cloudflare Terraform provider
- Cloudflare DNS
- Cloudflare Page Rules
- Cloudflare zone settings

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- Cloudflare Terraform provider overview and usage: https://developers.cloudflare.com/api/terraform/
- Cloudflare Terraform DNS records resource: https://developers.cloudflare.com/api/terraform/resources/dns/subresources/records/
- Cloudflare Terraform zones and zone settings resources: https://developers.cloudflare.com/api/terraform/resources/zones/
- Cloudflare zone settings API reference: https://developers.cloudflare.com/api/resources/zones/subresources/settings/
- Cloudflare Page Rules Terraform resource: https://developers.cloudflare.com/api/terraform/resources/page_rules/
- Cloudflare Page Rules product documentation: https://developers.cloudflare.com/rules/page-rules/
- Cloudflare Page Rules settings reference: https://developers.cloudflare.com/rules/page-rules/reference/settings/
- Cloudflare DNS proxy status documentation: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare DNS TTL documentation: https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/
- Cloudflare API token permissions reference: https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- Cloudflare SSL/TLS Full (strict) mode documentation: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/

## Issues Found
- The post used older Cloudflare provider v4-style examples (`cloudflare_record`, `cloudflare_zone`, `cloudflare_zone_settings_override`) that do not match the current provider documentation. I updated the snippets to the current provider shape (`cloudflare_dns_record`, `cloudflare_zones`, and `cloudflare_zone_setting`).
- The DNS record examples used the old `value` attribute. I changed them to the current `content` attribute and updated subdomain record names to fully qualified hostnames where the current docs expect complete record names.
- The zone settings example used `cloudflare_zone_settings_override` and `ssl = "full_strict"`. I replaced the bulk settings example with individual `cloudflare_zone_setting` resources and corrected the SSL mode value to `strict`, which is the documented API value for Full (strict).
- The page rule examples used the old `target` field and nested `actions` blocks. I updated them to the current `targets` and `actions` list-based syntax documented by Cloudflare.
- The `no_cache_api` page rule targeted `api.<domain>` without defining a proxied `api` DNS record. I added a proxied `api` record so the example can actually match requests as described.
- The MX example referenced `mail2.<domain>` without defining a corresponding DNS record. I added a `mail2` A record so the MX targets are resolvable.
- The API token guidance was too narrow for the configuration shown. I updated it to reflect the permissions needed by this example: `Zone Read`, `DNS Write`, `Page Rules Write`, and `Zone Settings Write`.

## Review Notes
Cloudflare still documents Page Rules, so the post remains technically valid after the fixes. However, Cloudflare also documents newer Rules products, notes that alternative Rules options provide greater configurability, and states that those newer Rules products take precedence over Page Rules when both match. A future revision could migrate the page-rule examples to newer Rules constructs, but that was not required to make this post technically correct.
