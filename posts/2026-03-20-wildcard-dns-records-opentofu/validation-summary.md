# Validation Summary: How to Create Wildcard DNS Records with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu / Terraform HCL
- AWS provider (aws_route53_record, aws_route53_zone, aws_acm_certificate, aws_lb)
- Cloudflare provider v5 (cloudflare_dns_record, cloudflare_zone)
- Azure provider (azurerm_dns_a_record)

## Sources Consulted
- Cloudflare Terraform provider docs (cloudflare_dns_record) — https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/resources/dns_record.md (verified v5 resource name, `content` field replacing `value`, required `ttl`, `proxied`, relative `name`)
- Cloudflare Terraform provider docs (cloudflare_zone data source) — https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/data-sources/zone.md (verified inputs `zone_id`/`filter` and output `.id`)
- Cloudflare provider v4→v5 migration discussion — https://github.com/cloudflare/terraform-provider-cloudflare/issues/7072 (confirmed `cloudflare_record` renamed to `cloudflare_dns_record` in v5)

## Issues Found
- The Cloudflare example used the legacy v4 syntax `resource "cloudflare_record"` with a `value` argument. Both were removed in the current Cloudflare provider v5: the resource is now `cloudflare_dns_record` and the record data argument is `content`. Fixed: renamed the resource to `cloudflare_dns_record` and changed `value = var.origin_ip` to `content = var.origin_ip`. Added a clarifying comment that `ttl = 1` means "automatic" (required when `proxied = true`).

## Review Notes
- The AWS Route53 examples (`aws_route53_record` with `zone_id`, `name`, `type`, `ttl`, `records`, and the `alias { name, zone_id, evaluate_target_health }` block) are valid and current.
- The ACM wildcard certificate example, including iterating `domain_validation_options` (with `resource_record_name`/`resource_record_value`/`resource_record_type`) via `for_each` and `create_before_destroy`, is correct standard practice.
- `data.cloudflare_zone.main.id` remains valid in v5 (the data source still exposes `.id` as the zone identifier output).
- The Azure `azurerm_dns_a_record` example uses valid arguments (`name = "*"`, `zone_name`, `resource_group_name`, `ttl`, `records`).
- DNS conceptual claims (wildcard matches subdomains without a more specific record; specific records take precedence over the wildcard) are accurate.
