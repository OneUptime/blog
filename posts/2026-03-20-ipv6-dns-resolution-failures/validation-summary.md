# Validation Summary: How to Troubleshoot IPv6 DNS Resolution Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS and AAAA records
- IPv6
- DNS64 and NAT64
- DNSSEC
- BIND `dig`
- Linux resolver tooling (`resolvectl`, `/etc/resolv.conf`, `/etc/gai.conf`, `ping`)
- Python `socket.getaddrinfo()`

## Sources Consulted
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/v9.18.42/manpages.html
- systemd `resolvectl` manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Linux `getaddrinfo(3)` manual: https://man7.org/linux/man-pages/man3/getaddrinfo.3.html
- Linux `gai.conf(5)` manual: https://man7.org/linux/man-pages/man5/gai.conf.5.html
- RFC 6147, DNS64: https://www.rfc-editor.org/rfc/rfc6147
- RFC 7050, discovery using `ipv4only.arpa`: https://datatracker.ietf.org/doc/html/rfc7050
- RFC 4035, DNSSEC protocol modifications: https://www.rfc-editor.org/rfc/rfc4035.html
- RFC 6724, default address selection for IPv6: https://www.rfc-editor.org/rfc/rfc6724.html

## Issues Found
- The DNS64 example used `ipv4only-host.example.com`, which is not the RFC-defined well-known IPv4-only name for DNS64 detection. I changed the example to `ipv4only.arpa` and updated the explanation to note that synthesized prefixes may be `64:ff9b::/96` or a network-specific prefix.
- The DNSSEC isolation example incorrectly used `+nodnssec`, which only stops requesting DNSSEC records and does not disable validation on the recursive resolver. I changed it to `+dnssec +cdflag` and updated the explanation to compare normal resolution with checking-disabled resolution.
- The resolver-validation example incorrectly implied that querying `SOA .` proves DNSSEC validation. I replaced it with a signed-answer example that tells the reader to inspect the `ad` flag.
- The `/etc/gai.conf` guidance implied that adding a single precedence line is sufficient. Per `gai.conf(5)`, adding any precedence line replaces the default precedence table, so I changed the guidance to say the full default table must be copied before raising `::ffff:0:0/96`.
- The IPv6 reachability example used `ping6` against the first resolver in `/etc/resolv.conf`, which can be an IPv4-only address and produce misleading results. I changed it to select the first configured IPv6 nameserver and use `ping -6`.
- The bundled diagnostic script used `dig ... || echo "Failed"` for public-resolver lookups, which does not report empty AAAA answers because `dig` exits successfully on many DNS negatives. I changed those checks to test whether the command returned any AAAA data.

## Review Notes
- The guide is Linux-centric: `resolvectl`, `/etc/resolv.conf`, `/etc/gai.conf`, and the `ping` examples are not portable to macOS or Windows.
- The NAT64 connectivity test still depends on a public IPv4-only hostname (`ipv4.icanhazip.com`), so that endpoint may need to be swapped in the future if its DNS records change.
