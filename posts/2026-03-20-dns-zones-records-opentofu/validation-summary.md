# Validation Summary: How to Manage DNS Zones and Records with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Route53
- Cloudflare DNS
- HCL
- DNS record types: A, AAAA, CNAME, MX, and TXT
- `dig`

## Sources Consulted
- OpenTofu installation docs: https://opentofu.org/docs/intro/install/
- OpenTofu `tofu init` docs: https://opentofu.org/docs/cli/init/
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu backend configuration docs: https://opentofu.org/docs/language/settings/backends/configuration/
- Cloudflare Terraform provider overview: https://developers.cloudflare.com/api/terraform/
- Cloudflare Terraform DNS resource docs: https://developers.cloudflare.com/api/terraform/resources/dns/
- Cloudflare Terraform Zones docs: https://developers.cloudflare.com/api/terraform/resources/zones/
- Cloudflare DNS TTL reference: https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/
- Terraform Registry provider versions for AWS: https://registry.terraform.io/v1/providers/hashicorp/aws/versions
- Terraform Registry provider versions for Cloudflare: https://registry.terraform.io/v1/providers/cloudflare/cloudflare/versions

## Issues Found
- The prerequisites block ran `tofu init` before any configuration files existed. I removed that command because OpenTofu documents `tofu init` as initializing a working directory that contains configuration.
- The AWS provider example was pinned to `~> 5.0` even though the current provider major is 6.x. I updated it to `~> 6.0`.
- The Cloudflare provider example was pinned to `~> 4.0`, but the current provider major is 5.x. I updated it to `~> 5.0`.
- The Cloudflare DNS examples used the older `cloudflare_record` resource and `value` attribute. I updated them to `cloudflare_dns_record` and `content`, which match the current Cloudflare provider docs.
- The Cloudflare zone lookup used `name = "example.com"` directly in `data "cloudflare_zone"`. I updated it to the current `filter = { name = "example.com" }` form.
- The Cloudflare DNS examples used shorthand names such as `@` and `www`, but the current docs define `name` as the complete DNS record name. I updated the examples to use `example.com` and `www.example.com`.
- The proxied Cloudflare record examples used inconsistent TTL guidance. I updated the proxied examples to use `ttl = 1` where TTL is shown, matching Cloudflare's automatic TTL behavior for proxied records.
- The description and Cloudflare section wording implied that the post creates Cloudflare zones. I corrected the wording to say the post manages records in an existing Cloudflare zone, which is what the code actually does.
- The best-practices section said to use data sources for existing zones rather than managing them in OpenTofu as a blanket rule. I narrowed this to zones you do not want OpenTofu to create or manage.
- The remote-state best-practice line mentioned Terraform Cloud specifically. I updated it to say "another supported remote backend" so the advice stays aligned with OpenTofu's backend documentation.

## Review Notes
- The Route53 resource examples are compatible with the current AWS provider major after the version-constraint refresh.
- The `dig` verification commands are syntactically correct, but real-world validation still depends on correct domain delegation and DNS propagation after apply.
