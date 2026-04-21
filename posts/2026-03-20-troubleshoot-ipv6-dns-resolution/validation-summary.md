# Validation Summary: How to Troubleshoot IPv6 DNS Resolution Failures - Troubleshoot

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- IPv6 DNS resolution
- DNS AAAA records
- BIND `dig`, `delv`, and `rndc`
- Unbound cache control
- systemd-resolved / `resolvectl`
- Linux `ss`, `ip6tables`, `sysctl`, and `ping`
- OpenBSD netcat / `nc`
- Python `socket.getaddrinfo()`
- DNSSEC, negative caching, DNS64

## Sources Consulted
- BIND 9 Manual Pages for `dig`, `delv`, and DNSSEC query options: https://bind9.readthedocs.io/en/v9.20.17/manpages.html
- BIND 9 Manual Pages for `rndc flush`: https://bind9.readthedocs.io/en/v9.20.19/manpages.html
- NLnet Labs Unbound `unbound-control` manual: https://www.nlnetlabs.nl/documentation/unbound/unbound-control/
- systemd `resolvectl` manual: https://man7.org/linux/man-pages/man1/resolvectl.1.html
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/html/rfc3596
- RFC 2308, Negative Caching of DNS Queries: https://datatracker.ietf.org/doc/html/rfc2308
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 6147, DNS64: https://datatracker.ietf.org/doc/html/rfc6147
- Google Public DNS setup documentation: https://developers.google.com/speed/public-dns/docs/using
- Linux kernel IPv6 documentation: https://docs.kernel.org/networking/ipv6.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux `resolv.conf(5)` manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- Linux `nsswitch.conf(5)` manual: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html
- Python `socket.getaddrinfo()` documentation: https://docs.python.org/3/library/socket.html
- iproute2 `ss(8)` manual: https://manpages.debian.org/bookworm/iproute2/ss.8.en.html
- Linux `iptables/ip6tables(8)` manual: https://man7.org/linux/man-pages/man8/iptables.8.html
- OpenBSD `nc(1)` manual: https://man.openbsd.org/nc.1
- Local command help output for installed `dig`, `ss`, `ip6tables`, `nc`, `resolvectl`, `sysctl`, and `ping`

## Issues Found
- The guide used `2001:db8::53` as a reachable DNS server. RFC 3849 reserves `2001:db8::/32` for documentation, so I replaced the active test target with Google Public DNS IPv6 address `2001:4860:4860::8888`.
- The `ss -6 -tlnp` listener check only covered TCP. DNS commonly uses UDP and TCP, so I changed it to `ss -6 -lntup` and updated the explanatory text and diagnostic script.
- The `dig RRSIG AAAA example.com` command was parsed by `dig` as an AAAA query with an extra type option, not as intended. I replaced it with `dig AAAA example.com +dnssec`, which returns RRSIG records covering the AAAA RRset when available.
- The DNSSEC `+cd` wording used an accepted abbreviation but the documented BIND option is `+cdflag`. I changed the command and summary to `+cdflag`.
- The negative-cache examples used `+ttl`; the documented `dig` option is `+ttlid`. I updated both examples.
- The AAAA-record check implied empty `+short` output always means no AAAA record exists. I clarified that the full `dig` status must be checked, and that NOERROR with an empty answer indicates NODATA.
- The `nc` command tested TCP connectivity without `-z` and used the reserved documentation address. I changed it to a zero-I/O TCP connectivity check against the Google Public DNS IPv6 address and narrowed the explanation to TCP reachability.
- The firewall rule comment implied that any missing ACCEPT rule must be added. I clarified that this applies when the INPUT policy drops inbound DNS and no earlier rule allows port 53.
- The `nsswitch.conf` comment was too strict for systems using systemd-resolved. I changed it to require a DNS-capable source such as `dns` or `resolve`.
- The IPv6 sysctl check relied only on `net.ipv6.conf.all.disable_ipv6`. Kernel documentation notes per-interface settings matter, so I added `default.disable_ipv6` and a note to check the affected interface.
- The GRUB kernel-parameter check treated any `ipv6.disable` occurrence as disabled. I changed it to extract the actual value and note that `ipv6.disable=1` means IPv6 was disabled at boot.
- The diagnostic script used `ping6`, which is commonly a compatibility symlink to `ping`. I changed it to `ping -6` and quoted `$DOMAIN` in `dig` calls.

## Review Notes
The guide is technically relevant and accurate after the fixes. Future improvements could mention that AAAA lookups can succeed over IPv4 DNS transport, so DNS-over-IPv6 failures and missing AAAA records are related but distinct failure modes.
