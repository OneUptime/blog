# Validation Summary: How to Set Up End-to-End IPv6 Content Delivery (DNS + CDN + Origin)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DNS
- NGINX
- Cloudflare
- Amazon CloudFront
- Fastly
- Terraform
- `curl`
- `dig`
- `nslookup`
- `ip`
- `ss`

## Sources Consulted
- Cloudflare IPv6 compatibility docs: https://developers.cloudflare.com/network/ipv6-compatibility/
- Cloudflare proxy status docs: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare Terraform DNS record docs: https://developers.cloudflare.com/api/terraform/resources/dns/subresources/records/
- Amazon CloudFront IPv6 guide: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-enable-ipv6.html
- Amazon CloudFront `CustomOriginConfig` API reference: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CustomOriginConfig.html
- Fastly dual-stack guide: https://www.fastly.com/documentation/guides/full-site-delivery/domains-and-origins/enabling-dualstack-connections/
- Fastly host/origin configuration guide: https://www.fastly.com/documentation/guides/getting-started/hosts/working-with-hosts/
- Fastly backend API reference: https://www.fastly.com/documentation/reference/api/services/backend/
- HashiCorp AWS provider source for `aws_cloudfront_distribution`: https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/cloudfront/distribution.go
- Fastly Terraform provider source for backend schema: https://github.com/fastly/terraform-provider-fastly/blob/main/fastly/block_fastly_service_backend.go
- Local CLI help/output: `curl --help all`, `ip --help`, `ss --help`, `nslookup -type=AAAA example.com`

## Issues Found
- The Cloudflare section incorrectly said Cloudflare automatically chooses IPv6 for dual-stack origins. Cloudflare’s current docs state that for proxied records with both IPv4 and IPv6 origin addresses, Cloudflare prefers IPv4. I corrected the explanation and added the AAAA-only origin caveat for users who need the origin leg to remain on IPv6.
- The CloudFront example implied that `is_ipv6_enabled = true` was enough for end-to-end IPv6. AWS documents that viewer IPv6 and origin IPv6 are separate settings. I updated the example to set `custom_origin_config.ip_address_type = "ipv6"` and added the minimal required CloudFront blocks so the Terraform example is structurally valid.
- The Fastly example said IPv6 origin connectivity happened automatically. Current Fastly docs and provider schema expose `prefer_ipv6`; for Delivery services the default is `false`. I added `prefer_ipv6 = true`.
- Several placeholders were not syntactically valid addresses or records, including `2001:db8::cdn`, `203.0.113.cdn`, and `2606:4700::xxxx`. I replaced those with valid examples or generic provider-assigned-address wording.
- The Cloudflare Terraform example used the older `cloudflare_record` resource and `value` attribute. Current Cloudflare Terraform docs use `cloudflare_dns_record` with `content`. I updated the snippet accordingly.
- The original DNS guidance suggested hard-coding CDN A and AAAA addresses. That is not how CloudFront or similar CDNs are normally published. I changed the example to point a hostname at the CDN hostname with a CNAME and added the apex ALIAS/ANAME/CNAME-flattening note.
- The origin-log verification used `grep "::"` to detect IPv6 addresses. That is not reliable because valid IPv6 strings do not always contain `::`. I changed the example to print the source address field and clarified that origin-side IP family is provider-specific.

## Review Notes
- Cloudflare can serve IPv6 to clients at the edge while still preferring IPv4 on the origin hop for dual-stack proxied origins; that nuance is now reflected in the post.
- CloudFront’s origin-side IPv6 support applies to custom origins, not S3 bucket origins or VPC origins, per AWS documentation.
- Fastly edge IPv6 and Fastly-to-origin IPv6 are configured separately; the post now distinguishes those paths.
- Terraform CLI validation was not run in this environment because `terraform` is not installed, but the updated snippets were checked against current official docs and provider source/schema references.
