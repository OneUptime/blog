# Validation Summary: How to Configure Cloudflare IPv6-to-IPv4 Origin Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cloudflare proxy status for DNS records
- Cloudflare IPv6 Compatibility
- Cloudflare zone settings API
- Cloudflare DNS records API
- Terraform Cloudflare provider
- Nginx real IP handling
- `iptables` firewall rules

## Sources Consulted
- Cloudflare IPv6 compatibility: https://developers.cloudflare.com/network/ipv6-compatibility/
- Cloudflare Pseudo IPv4: https://developers.cloudflare.com/network/pseudo-ipv4/
- Cloudflare zone settings API: https://developers.cloudflare.com/api/resources/zones/subresources/settings/methods/edit/
- Cloudflare DNS API: https://developers.cloudflare.com/api/resources/dns/
- Cloudflare proxy status docs: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare HTTP headers reference: https://developers.cloudflare.com/fundamentals/reference/http-headers/
- Cloudflare restoring original visitor IPs: https://developers.cloudflare.com/support/troubleshooting/restoring-visitor-ips/restoring-original-visitor-ips/
- Cloudflare IP addresses guidance: https://developers.cloudflare.com/fundamentals/concepts/cloudflare-ip-addresses/
- Official Terraform Cloudflare provider `cloudflare_dns_record` resource docs: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/resources/dns_record.md
- Official Terraform Cloudflare provider `cloudflare_zone_setting` resource docs: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/resources/zone_setting.md

## Issues Found
- The post described IPv6 Compatibility as a setting that must be enabled manually. Cloudflare’s current docs state it is on by default for proxied hostnames, so the post was corrected to say it should remain enabled and only needs API action if previously disabled.
- The Terraform example used outdated provider resources and arguments: `cloudflare_record`, `value`, and `cloudflare_zone_settings_override`. These were updated to the current provider resources `cloudflare_dns_record` and `cloudflare_zone_setting`, and the required `content`/`ttl` fields were added.
- The post claimed Cloudflare would add AAAA records from the fixed `2606:4700::/32` range. Current docs support automatic AAAA responses for proxied hostnames, but the returned anycast addresses should not be treated as a single fixed prefix in documentation. This was rewritten to describe Cloudflare’s anycast IPv6 behavior accurately.
- The Nginx example mixed an IPv4-only origin scenario with partial IPv6 Cloudflare source ranges. It was corrected to trust the published Cloudflare IPv4 list for this IPv4-origin scenario instead of showing incomplete IPv6 examples.
- The firewall section did not actually restrict direct IPv4 access to the origin and instead showed an unrelated `ip6tables` example. It was replaced with an IPv4 allowlist/drop example that matches the post’s stated IPv4-only origin setup.
- The testing note referred to checking `CF-Connecting-IP` values in access logs even though the Nginx example restores the client IP into `$remote_addr`. The test guidance was adjusted to match the configuration shown earlier in the post.

## Review Notes
- Cloudflare documents Pseudo IPv4 as useful when origin software cannot handle IPv6-formatted client IPs in headers. That is a compatibility caveat for some legacy applications, but it is not required for the basic IPv6-client-to-IPv4-origin connectivity described in this post.
