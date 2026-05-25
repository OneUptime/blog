# Validation Summary: How to Create Cloudflare DNS Records with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Cloudflare Terraform Provider
- Cloudflare DNS
- DNS A, CNAME, MX, TXT, and SRV records
- Cloudflare proxied DNS records

## Sources Consulted
- Cloudflare Terraform provider v5 tutorial: https://developers.cloudflare.com/terraform/tutorial/track-history/
- Cloudflare Terraform DNS record resource reference: https://developers.cloudflare.com/api/terraform/resources/dns/subresources/records/
- Cloudflare DNS record types reference: https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/
- Cloudflare proxy status reference: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare Terraform v5 provider changelog: https://developers.cloudflare.com/changelog/post/2025-02-03-terraform-v5-provider/

## Issues Found
- The post used the Cloudflare provider v4 `cloudflare_record` resource and pinned `~> 4.0`. Updated the examples to provider `~> 5.0` and the current `cloudflare_dns_record` resource.
- The provider setup passed an API token directly via `api_token`. Updated it to use the `CLOUDFLARE_API_TOKEN` environment variable, which is the current Cloudflare v5 documentation pattern.
- The introduction implied Cloudflare's proxy feature applies to all DNS record types. Updated the wording to clarify that only A, AAAA, and CNAME records can be proxied; other record types are DNS-only.
- The dynamic services example used private RFC1918 IP addresses, including one proxied A record. Replaced those with documentation-reserved public example IP addresses to avoid implying standard proxied records can reach private origins without Cloudflare private network routing.
- The SRV example used the older nested `data` block fields for service, protocol, and name. Updated it to the current `data = { priority, weight, port, target }` shape shown in Cloudflare's DNS record documentation.
- The outputs referenced the old `hostname` attribute on `cloudflare_record`. Updated outputs to use the v5 `name` attribute on `cloudflare_dns_record`.

## Review Notes
Terraform/OpenTofu is not installed in this environment, so I could not run `terraform init` or `terraform validate`. The examples were reviewed against the current official Cloudflare Terraform and DNS documentation.
