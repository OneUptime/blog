# Validation Summary: How to Manage Cloudflare AAAA Records with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cloudflare DNS
- Cloudflare Terraform provider
- Terraform
- IPv6
- AAAA DNS records
- Cloudflare REST API
- Google Cloud load balancing

## Sources Consulted
- Cloudflare Terraform tutorial: https://developers.cloudflare.com/terraform/tutorial/initialize-terraform/
- Cloudflare Terraform provider overview: https://developers.cloudflare.com/api/terraform/
- Cloudflare Terraform DNS resource reference: https://developers.cloudflare.com/api/terraform/resources/dns
- Cloudflare Terraform zones reference: https://developers.cloudflare.com/api/terraform/resources/zones/
- Cloudflare DNS record types reference: https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/
- Cloudflare DNS TTL reference: https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/
- Cloudflare proxy status reference: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare proxy limitations reference: https://developers.cloudflare.com/dns/proxy-status/limitations/
- Cloudflare changelog: Terraform v5 Provider is now generally available: https://developers.cloudflare.com/changelog/post/2025-02-03-terraform-v5-provider/
- HashiCorp Google provider docs for `google_compute_global_forwarding_rule`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule
- Local CLI help for `dig`: `dig -h`

## Issues Found
- The post targeted the older Cloudflare Terraform v4 model. I updated the provider version from `~> 4.0` to `~> 5`, changed `cloudflare_record` to `cloudflare_dns_record`, and changed `value` to `content` to match current Cloudflare Terraform v5 documentation.
- The zone lookup snippet used the older `data "cloudflare_zone"` shape with `name = "example.com"`. I updated it to the current v5-style `filter = { name = "example.com" }` syntax from the Cloudflare zones reference.
- The proxied root AAAA example set `ttl = 300`. Cloudflare’s current DNS docs state proxied records use Auto TTL, so I changed this to `ttl = 1` and clarified the comment.
- The proxied multi-record example included a `mail` hostname, which is misleading because Cloudflare proxying is for HTTP/HTTPS traffic. I replaced that proxied example hostname with `blog` and kept `mail` in the DNS-only example.
- The `dig` verification example had the arguments in the wrong order. I corrected it to `dig @1.1.1.1 www.example.com AAAA`.
- The verification `curl` command used `CF_API_TOKEN`, while the provider section referenced `CLOUDFLARE_API_TOKEN`. I aligned the command with Cloudflare’s documented environment variable name for consistency.

## Review Notes
- Terraform CLI was not installed in this workspace, so I could not run `terraform validate` locally. The Terraform snippets were verified against current official Cloudflare and HashiCorp documentation instead.
- The dynamic GCP example assumes an existing `google_compute_global_forwarding_rule` resource named `ipv6`; the referenced `ip_address` attribute is current, but the surrounding Google provider configuration is intentionally outside the scope of this post.
