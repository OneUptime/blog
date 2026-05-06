# Validation Summary: How to Configure AAAA Records in dnsmasq

## Status
validated

## Post Type
Guide

## Technologies Covered
- dnsmasq
- DNS
- IPv6
- AAAA records
- `/etc/hosts`
- `dig`
- `nslookup`

## Sources Consulted
- dnsmasq man page: https://dnsmasq.org/docs/dnsmasq-man.html
- dnsmasq documentation overview: https://dnsmasq.org/doc.html
- dnsmasq setup documentation: https://dnsmasq.org/docs/setup.html
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762
- RFC 8375, Special-Use Domain 'home.arpa.': https://www.rfc-editor.org/rfc/rfc8375
- RFC 8482, Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY: https://www.rfc-editor.org/rfc/rfc8482
- Local CLI validation with installed `dnsmasq 2.90` using `dnsmasq --help`, `dnsmasq --version`, and `dnsmasq --test`

## Issues Found
- The post referred to an `aaaa-record` directive that dnsmasq does not provide. I replaced that section with valid `host-record` AAAA-only examples.
- The `host-record` explanation implied it always creates both record types. I corrected the wording and inline format comment to reflect that `host-record` can create A records, AAAA records, or both.
- The SIGHUP example used the wrong default pid file path. I corrected it from `/var/run/dnsmasq/dnsmasq.pid` to `/var/run/dnsmasq.pid`, which matches the upstream documentation and local `dnsmasq --help` output.
- The `address=` section contained an invalid IPv6 literal (`2001:db8::api`) and incorrect wildcard syntax for subdomains. I replaced the address with a valid documentation IPv6 address and changed the wildcard example to `/*.internal.example.com/`, which matches dnsmasq's documented pattern rules.
- The `address=` note said the directive returns the same value for all record types. I corrected that explanation to match current dnsmasq behavior and noted the 2.86+ change for queries that do not match the configured address family.
- The verification section used `dig ANY` as if it were a reliable way to retrieve both A and AAAA records. I replaced it with explicit `dig AAAA` and `dig A` queries, which is more accurate and aligns with RFC 8482's guidance around `ANY`.
- The examples used `.local` hostnames for unicast DNS. Because RFC 6762 reserves `.local.` for Multicast DNS and explicitly recommends against using it for private unicast DNS, I changed the example hostnames to `home.arpa`, the special-use home-network domain defined by RFC 8375.
- The IPv6 listener section implied that `bind-interfaces` enables IPv6 support. I corrected that section so it describes listener scoping rather than IPv6 capability.

## Review Notes
- `dnsmasq` only re-reads `/etc/hosts`, `addn-hosts`, and related host files on SIGHUP; it does not re-read `dnsmasq.conf` on SIGHUP. The post now distinguishes hosts-file reloads from configuration changes that require a restart or equivalent full service reload.
- The corrected configuration snippets were syntax-checked locally with `dnsmasq --test` against the installed `dnsmasq 2.90`.
