# Validation Summary: How to Configure Fastly CDN for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fastly CDN / Full-Site Delivery
- Fastly VCL
- Fastly API backends/origins
- Terraform Fastly provider
- IPv6 / dual-stack DNS
- `curl` and `dig`

## Sources Consulted
- Fastly Docs: Enabling dualstack connections — https://www.fastly.com/documentation/guides/full-site-delivery/domains-and-origins/enabling-dualstack-connections/
- Fastly Docs: Working with hosts — https://www.fastly.com/documentation/guides/getting-started/hosts/working-with-hosts/
- Fastly API reference: Backend — https://www.fastly.com/documentation/reference/api/services/backend/
- Fastly VCL reference: `client.ip` — https://www.fastly.com/documentation/reference/vcl/variables/client-connection/client-ip/
- Fastly VCL reference: `req.is_ipv6` — https://www.fastly.com/documentation/reference/vcl/variables/client-connection/req-is-ipv6/
- Fastly HTTP header reference: `Fastly-Client-IP` — https://www.fastly.com/documentation/reference/http/http-headers/Fastly-Client-IP/
- Fastly HTTP header reference: `X-Forwarded-For` — https://www.fastly.com/documentation/reference/http/http-headers/X-Forwarded-For/
- Fastly VCL guide: custom VCL and boilerplate requirements — https://www.fastly.com/documentation/guides/full-site-delivery/custom-vcl/using-vcl/
- Fastly VCL reference: `addr.extract_bits` — https://www.fastly.com/documentation/reference/vcl/functions/addr/addr-extract-bits/
- Fastly VCL reference: `std.itoa` — https://www.fastly.com/documentation/reference/vcl/functions/strings/std-itoa/
- Fastly VCL reference: `std.str2ip` — https://www.fastly.com/documentation/reference/vcl/functions/strings/std-str2ip/
- Fastly VCL reference: `ratelimit.check_rate` — https://www.fastly.com/documentation/reference/vcl/functions/rate-limiting/ratelimit-check-rate/
- Fastly rate limiting guide — https://www.fastly.com/documentation/guides/concepts/rate-limiting/
- Official Fastly Terraform provider docs/source: `fastly_service_vcl` — https://github.com/fastly/terraform-provider-fastly/blob/main/docs/resources/service_vcl.md
- Official Fastly Terraform provider source: backend schema defaults — https://github.com/fastly/terraform-provider-fastly/blob/main/fastly/block_fastly_service_backend.go

## Issues Found
- Client-side IPv6 enablement was described as a backend toggle. I corrected the dashboard section to reflect Fastly's current dualstack DNS/CNAME flow and the support caveats for `map.fastly.net` hostnames and apex Anycast IPv4 addresses.
- The API example implied IPv6 origin use was automatic. I added `prefer_ipv6=1` to the backend API example and clarified that client-facing IPv6 is enabled separately through dualstack DNS.
- The Terraform example claimed no explicit IPv6 flag was needed. I added `prefer_ipv6 = true` and clarified that a main custom VCL file should be based on Fastly's boilerplate.
- The VCL example used `client.ip ~ ":"` to detect IPv6, which is not the correct Fastly VCL pattern. I replaced it with `req.is_ipv6` and corrected the client IP forwarding logic to use `Fastly-Client-IP`.
- The main custom VCL example looked like a complete main VCL file without the required Fastly boilerplate and macro placeholders. I clarified that the example must be added to a boilerplate-based custom VCL file.
- The testing section referenced `X-Cache` behavior using commands that did not actually show headers and hard-coded a sample IPv6 range. I updated the commands to use `curl -I` for the cache check and generalized the AAAA-record expectation.
- The IPv6 rate-limiting snippet used invalid IPv6 matching and a brittle regex-based `/64` extraction. I replaced it with a documented Edge Rate Limiting example using `ratecounter`, `penaltybox`, `req.is_ipv6`, `addr.extract_bits`, and `ratelimit.check_rate`, and noted the product prerequisite.

## Review Notes
- Fastly's dualstack client enablement path depends on the type of service hostname in use. Shared hostnames can use `dualstack.*.fastly.net`, while `map.fastly.net` hostnames and apex Anycast IPv4 setups may require Fastly support involvement.
- The rate-limiting example assumes the Edge Rate Limiting product is enabled on the account.
- The post now uses explicit `prefer_ipv6` settings in API and Terraform examples to avoid ambiguity around defaults.
