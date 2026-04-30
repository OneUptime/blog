# Validation Summary: How to Force DNS Queries Over TCP Instead of UDP

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- DNS
- `dig`
- `systemd-resolved`
- Unbound
- BIND 9
- Python
- dnspython
- `nc`
- `tcpdump`

## Sources Consulted
- ISC BIND 9 manual pages: https://bind9.readthedocs.io/en/v9.20.16/manpages.html
- ISC BIND 9 configuration reference: https://bind9.readthedocs.io/en/v9.20.16/reference.html
- systemd `resolved.conf` documentation: https://www.freedesktop.org/software/systemd/man/257/resolved.conf.d.html
- systemd `resolvectl` documentation: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Google Public DNS DNS-over-TLS guide: https://developers.google.com/speed/public-dns/docs/dns-over-tls
- Unbound `unbound.conf(5)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Unbound configuration guide: https://unbound.docs.nlnetlabs.nl/en/latest/getting-started/configuration.html
- dnspython resolver documentation: https://dnspython.readthedocs.io/en/stable/resolver-class.html
- dnspython message construction documentation: https://dnspython.readthedocs.io/en/latest/message-make.html
- dnspython query documentation: https://dnspython.readthedocs.io/en/stable/query.html
- OpenBSD `nc(1)` manual: https://man.openbsd.org/nc.1
- RFC 768: User Datagram Protocol: https://www.rfc-editor.org/rfc/rfc768
- RFC 7766: DNS Transport over TCP - Implementation Requirements: https://www.rfc-editor.org/rfc/rfc7766.html

## Issues Found
- The original `nc -zu 8.8.8.8 53` example implied UDP reachability can be validated the same way as TCP. I replaced it with a real UDP DNS query because UDP is connectionless, and the OpenBSD `nc(1)` documentation notes that `-uz` scans always report success regardless of the target's state.
- The `systemd-resolved` example used `DNSOverTLS=yes` with only an IP address and appended directly to `resolved.conf`. I changed it to a drop-in file and added `#dns.google` so the resolver has the server name needed for strict DNS-over-TLS certificate validation and SNI.
- The Unbound section used `unbound-control reload` without accounting for the fact that remote control is disabled by default, and it tested against port `5335`, which is not Unbound's default listening port. I changed this to `unbound-checkconf && systemctl restart unbound` and a default `127.0.0.1` query.
- The dnspython sample referenced `dns.name.from_text()` without importing `dns.name`, and the second method described forcing truncation to trigger TCP instead of using dnspython's supported TCP flag. I changed the sample to use `dns.message.make_query(domain, ...)` and `resolver.resolve(..., tcp=True)`.
- The BIND section claimed `query-source` could be used to limit queries to TCP and showed an incomplete DNS-over-TLS forwarder example. I replaced that with the accurate statement that BIND has no general tcp-only recursive upstream option, removed the `query-source` claim, and supplied a working BIND 9.20+ DoT forwarding example with a `tls` block.
- The DoT verification example used `dig -p 853 +tcp +tls` without certificate validation, and the conclusion claimed a fixed 1-2 ms TCP penalty. I updated the `dig` example to use `+tls +tls-ca +tls-hostname=dns.google` and changed the latency claim to reflect that connection reuse can reduce TCP overhead.

## Review Notes
- The corrected `systemd-resolved` section forces TCP only for upstream resolver traffic. Local applications may still talk to the local stub listener over UDP or TCP.
- The corrected BIND forwarding example is version-specific and aligned to BIND 9.20+ syntax.
- The `tcpdump -i eth0` commands are valid examples, but readers may need to replace `eth0` with the actual interface name on their systems.
