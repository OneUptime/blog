# Validation Summary: How to Troubleshoot Proxy IPv6 Connection Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 networking
- Linux iproute2 (`ip -6 addr`, `ip -6 route`)
- `ping6` / `traceroute6`
- `ss` socket statistics utility
- Squid proxy (`http_port` directive)
- curl (`--proxy`, `-6`, `-v`, `-w`, `--max-time`)
- `ip6tables` firewall
- `dig` DNS lookups (AAAA records)
- Python `urllib.parse.urlparse` and `socket.getaddrinfo`
- `tcpdump` packet capture (BPF `ip6` filter)
- Bash scripting

## Sources Consulted
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- RFC 3986 — URI Generic Syntax (bracketed IPv6 host literals)
- Squid documentation — `http_port` directive: https://www.squid-cache.org/Doc/config/http_port/
- curl manual — `--proxy`, `-6`, `-w` options: https://curl.se/docs/manpage.html
- iproute2 / `ss` man page
- `ip6tables` man page (netfilter project)
- `tcpdump` / pcap-filter(7) man page (BPF `ip6` primitive)
- Python `urllib.parse` documentation: https://docs.python.org/3/library/urllib.parse.html
- Python `socket.getaddrinfo` documentation
- Google Public DNS IPv6 addresses (`2001:4860:4860::8888`, `::8844`): https://developers.google.com/speed/public-dns/docs/using
- Verified `urlparse` behavior locally — confirmed `hostname` returns `2001:db8::1` without brackets and `port` returns `3128`.

## Issues Found
No technical issues found.

- IPv6 documentation prefix `2001:db8::/32` is correctly used throughout (per RFC 3849).
- `curl --proxy "http://[2001:db8::1]:3128"` syntax with bracketed IPv6 literal is correct (RFC 3986).
- `ss -tlnp` flags and the listen-address representations (`*:3128`, `[::]:3128`) are accurate.
- Squid `http_port 3128` listens on all interfaces (dual-stack) by default, and `http_port [::]:3128` is a valid IPv6 form — matches official Squid docs.
- `tcpdump` BPF filter `ip6 and tcp port 3128` is a valid pcap-filter expression.
- `ip6tables -A INPUT -p tcp --dport/--sport 3128 -j ACCEPT` syntax is correct.
- Python `urlparse` results in the comments match actual behavior (verified locally).
- Common error → cause → solution table is accurate for typical IPv6 proxy failure modes.

## Review Notes
- `ping6` and `traceroute6` are still available on most distributions but are gradually being superseded by `ping -6` and `traceroute -6` in modern iputils/inetutils packages. Both forms remain functional today, so no change is required.
- `ip6tables` is being supplanted by `nftables` on newer distributions (RHEL 8+, Debian 11+). The legacy commands still work via the `iptables-nft` shim, so the examples remain valid for current systems but may need updating in the future.
- The `[::]:3128` Squid bind comment says "explicitly on IPv6 only" — on Linux this socket typically also accepts IPv4 via dual-stack mapped addresses unless `IPV6_V6ONLY` is set. The wording is a minor simplification but not technically wrong in the Squid context, so it was left unchanged.
- `httpbin.org` is a widely-used HTTP testing endpoint that remains operational; suitable for examples.
