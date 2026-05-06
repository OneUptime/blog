# Validation Summary: How to Configure dnsmasq as an IPv6 DNS Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- dnsmasq
- DNS
- IPv6
- DHCPv6
- SLAAC
- Router Advertisements
- DNSSEC

## Sources Consulted
- dnsmasq upstream man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- dnsmasq project documentation: https://dnsmasq.org/doc.html
- RFC 8375, Special-Use Domain 'home.arpa.': https://www.rfc-editor.org/rfc/rfc8375.html
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762.html
- IANA DNSSEC Trust Anchors and Rollovers: https://www.iana.org/dnssec/files
- Google Public DNS configuration guide: https://developers.google.com/speed/public-dns/docs/using
- Local validation with `dnsmasq 2.90` via `dnsmasq --help`, `man dnsmasq`, and `dnsmasq --test`

## Issues Found
- The post used `.local` for hostnames and DHCP search domains, and included `local=/local/`. I replaced those examples with `home.arpa` because `.local` is reserved for Multicast DNS by RFC 6762, while RFC 8375 defines `home.arpa` for local home-network naming.
- The post used `address=/host/...` as if it created exact per-host AAAA records. In dnsmasq, `address=` matches entire domains and subdomains. I replaced those lines with `host-record=` so the examples create exact local host records.
- The “Upstream IPv6 Forwarders” section included the IPv4 resolver `8.8.8.8`. I replaced it with Google Public DNS’s IPv6 resolver `2001:4860:4860::8888`.
- The DHCPv6 section mixed two valid pool styles without saying they were alternatives. I kept both examples but clarified the comments so readers do not interpret them as a required combined configuration.
- The static DHCPv6 example used an unbracketed IPv6 address in `dhcp-host=`. I changed it to the documented bracketed form `[2001:db8::50]`.
- The DNSSEC trust anchor snippet was labeled as `bash` even though it is a dnsmasq configuration directive. I changed the block to `ini`.
- The verification example and conclusion still referred to the old `.local` and `address=` examples. I updated them to match the corrected configuration.
- The listening check used `ss -lnup`, which only shows UDP sockets. I changed it to `ss -lnutp` so the example checks both UDP and TCP listeners on port 53.

## Review Notes
- The root trust anchor shown in the post is current as of 2026-05-06 according to IANA, but IANA has already published the successor root KSK and lists a rollover date of 2026-10-11. This snippet will need a future refresh or a note pointing readers to the current IANA trust-anchor data.
- In dnsmasq, forwarding a private zone with `server=/internal.example.com/...` disables DNSSEC validation for that zone unless a matching trust anchor is configured. The post’s example is valid, but that behavior is worth remembering if the article is expanded later.
- The corrected dnsmasq snippets were syntax-checked locally with `dnsmasq --test` against `dnsmasq 2.90`.
