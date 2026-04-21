# Validation Summary: How to Test IPv6 Connectivity with Online Tools (test-ipv6.com)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 connectivity testing
- test-ipv6.com
- curl
- ping6 / iputils
- dig / BIND DNS tools
- OpenSSL s_client
- netcat / nc
- Python requests
- Public IP address APIs

## Sources Consulted
- test-ipv6.com FAQ and live test pages: https://test-ipv6.com/faq.html and https://test-ipv6.com/
- test-ipv6.com current JavaScript/config endpoint patterns: https://test-ipv6.com/index.js.en_US and https://test-ipv6.com/site/config.js
- curl official documentation: https://curl.se/docs/manpage.html and https://curl.se/docs/tutorial.html
- ipify API documentation: https://www.ipify.org/
- ip6.me API documentation: https://ip6.me/docs/
- Requests advanced usage documentation: https://docs.python-requests.org/en/latest/user/advanced/
- Python socket documentation: https://docs.python.org/3/library/socket.html
- BIND 9 dig manual: https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility
- iputils ping6 manual: https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html
- iproute2 route manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- OpenSSL s_client documentation: https://docs.openssl.org/3.6/man1/openssl-s_client/
- OpenBSD nc manual: https://man.openbsd.org/nc.1
- RFC 8305, Happy Eyeballs Version 2: https://datatracker.ietf.org/doc/html/rfc8305

## Issues Found
- The post used `api64.my-ip.io`, which does not resolve. Replaced the `my-ip.io` public IP examples with the documented ipify endpoints: `api.ipify.org`, `api6.ipify.org`, and `api64.ipify.org`.
- The `my-ip.io/ip` examples also return redirects without `curl -L`, so the original commands would not reliably print an address. The ipify replacements return the address directly.
- The `https://ipv4.test-ipv6.com/ip/?callback=` example timed out during validation. Replaced it with `https://test-ipv6.com/ip/?callback=`, which is reachable over IPv4 because the main test-ipv6.com name intentionally has no AAAA record.
- The `https://ipv6.test-ipv6.com/ip/?callback=` example was unreliable over HTTPS during validation. Changed it to the HTTP IPv6-only endpoint documented by the test-ipv6.com FAQ.
- The post labeled `ip6.me/api/` as an IPv6-only endpoint, but the ip6.me documentation says it is dual-stack. Replaced it with `ip6only.me/api/`.
- The raw Google DNS HTTP example used `curl -6 http://[2001:4860:4860::8888]`, but that address is a DNS resolver, not an HTTP service, and the command timed out. Replaced it with `curl -6 -I https://ipv6.google.com`.
- The Python example claimed it forced IPv6 by resolving first, but the code did not do that. Removed the unused `socket` import and changed the comment to explain that `ipv6.icanhazip.com` requires IPv6 because it publishes only AAAA records.

## Review Notes
- `ping6`, `curl -6`, `dig AAAA`, `openssl s_client -connect '[IPv6]:443'`, and `nc -6` usage was checked against local command help and authoritative manuals.
- Network checks such as ICMP and SMTP port 25 can fail because of local firewall, provider policy, or remote filtering even when the command syntax is correct.
