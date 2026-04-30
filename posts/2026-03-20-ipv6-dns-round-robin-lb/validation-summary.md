# Validation Summary: How to Configure IPv6 Load Balancing with DNS Round-Robin

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DNS AAAA records
- DNS round-robin
- BIND zone files
- Cloudflare DNS with Terraform
- AWS Route 53 with Terraform
- Route 53 health checks
- `dig`
- `curl`

## Sources Consulted
- RFC 1035, DNS master file format and comment syntax: https://www.rfc-editor.org/rfc/rfc1035
- RFC 2308, SOA MINIMUM field / negative caching semantics: https://www.rfc-editor.org/rfc/rfc2308
- RFC 3596, AAAA record semantics and textual IPv6 format: https://www.rfc-editor.org/rfc/rfc3596
- RFC 3849, IPv6 documentation prefix `2001:db8::/32`: https://www.rfc-editor.org/rfc/rfc3849
- BIND 9 Administrator Reference, RRset ordering: https://bind9.readthedocs.io/en/v9.20.16/reference.html
- Cloudflare Terraform DNS resource docs: https://developers.cloudflare.com/api/terraform/resources/dns/
- Cloudflare Terraform provider `cloudflare_dns_record` docs: https://github.com/cloudflare/terraform-provider-cloudflare/blob/main/docs/resources/dns_record.md
- Cloudflare proxy status behavior: https://developers.cloudflare.com/dns/proxy-status/
- AWS Route 53 multivalue answer routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-multivalue.html
- AWS Route 53 health check values: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html
- Terraform AWS provider `aws_route53_record` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/route53_record.html.markdown
- Terraform AWS provider `aws_route53_health_check` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/route53_health_check.html.markdown
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The sample IPv6 addresses were invalid (`2001:db8::server1` style literals are not legal IPv6 syntax). Replaced them with valid documentation-prefix examples.
- The BIND zone-file snippet used shell-style `#` comments. DNS master files use `;`, so those comments were corrected.
- The explanation of record rotation was too absolute. Updated it to reflect that authoritative servers return the full RRset and many implementations vary ordering between responses.
- The SOA `MINIMUM` comment was outdated. Updated it to `negative cache TTL` to match current RFC 2308 semantics.
- The Cloudflare Terraform example used the older `cloudflare_record` resource with `value`. Updated it to the current `cloudflare_dns_record` resource with `content`.
- The Cloudflare example did not account for proxy behavior. Added `proxied = false` because proxied A/AAAA records resolve to Cloudflare anycast IPs rather than the origin addresses needed for DNS round-robin behavior.
- The Route 53 section labeled as multivalue answer routing was not actually using Route 53 multivalue answer routing. Rewrote it to use one record per endpoint with `set_identifier` and `multivalue_answer_routing_policy = true`, which matches AWS guidance.
- The weighted-routing comment implied `weight = 50` means a literal 50% split by itself. Clarified that the value is relative to sibling records.
- The Route 53 health-check example contained an invalid IPv6 literal and an incomplete `...` placeholder, so the snippet was not valid Terraform. Replaced it with a complete example.
- The testing section used `dig` against the default resolver, which may just return cached ordering, and used invalid `curl --connect-to` syntax. Updated the `dig` examples to query the authoritative server directly and changed the `curl` example to use the documented `--resolve` syntax for IPv6 targets.
- The limitations table overstated health-checking as an absolute limitation. Narrowed it to "No built-in health checking" so it matches the rest of the post.

## Review Notes
- The examples now use valid IPv6 addresses from the RFC 3849 documentation prefix (`2001:db8::/32`), which is the correct reserved range for documentation and examples.
- DNS round-robin remains best-effort distribution. Resolver caching and client behavior can still make traffic distribution uneven even when the DNS configuration is correct.
