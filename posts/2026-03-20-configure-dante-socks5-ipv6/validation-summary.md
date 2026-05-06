# Validation Summary: How to Configure Dante SOCKS5 Proxy for IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dante
- `danted`
- SOCKS5
- IPv6
- Linux networking
- `curl`
- Python
- PySocks

## Sources Consulted
- Debian `danted.conf(5)` man page: https://manpages.debian.org/unstable/dante-server/danted.conf.5.en.html
- Debian `danted(8)` man page: https://manpages.debian.org/bookworm/dante-server/danted.8.en.html
- Dante IPv6 configuration docs: https://www.inet.no/dante/doc/latest/config/ipv6.html
- RFC 1928, SOCKS Protocol Version 5: https://www.rfc-editor.org/rfc/rfc1928
- RFC 1929, Username/Password Authentication for SOCKS V5: https://www.rfc-editor.org/rfc/rfc1929
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- curl man page: https://curl.se/docs/manpage.html?previewMode=true
- curl URL syntax docs: https://curl.se/docs/url-syntax.html
- PySocks on PyPI: https://pypi.org/project/PySocks/
- PySocks source in Debian Sources: https://sources.debian.org/src/python-socksipy/1.7.1%2Bdfsg-1/socks.py

## Issues Found
- The introduction described Dante as a "SOCKS5 server (socksify)". `socksify` is the client-side wrapper, not the server, so I corrected the wording to "SOCKS server and client library."
- The Step 1 comment said username/password was "method 6". RFC 1928 defines USERNAME/PASSWORD as SOCKS5 method `0x02`, so I replaced that comment with a description of the actual Dante config behavior.
- Several Dante ACL examples used `0.0.0.0/0` in places that were supposed to match IPv6 traffic. Dante's docs distinguish `0.0.0.0/0` (IPv4 only), `::/0` (IPv6 only), and `0/0` (either family). I changed the client and socks rules to use `::/0` or `0/0` as appropriate so the IPv6 examples match what the post claims.
- The authentication section omitted `user.privileged: root`, which the Dante man page says is probably required when using password-based authentication. I added that line to the auth example.
- The `curl` auth example passed proxy credentials inside the `--socks5` host argument, and the IPv6 destination example used the invalid literal `2001:db8::server`. I changed the commands to documented `--proxy` / `--proxy-user` usage and fixed the IPv6 literal syntax.
- The IPv6 outbound-only example used `external: 2001:db8::proxy`, which is not a valid IPv6 address, and it did not show Dante's documented `external.protocol: ipv6` control for interface-name based configuration. I replaced it with `external.protocol: ipv6` followed by `external: eth0`.
- The Python example relied on monkeypatching `socket.socket`. PySocks' own docs say monkeypatching is generally not recommended, and its source contains separate helper logic for IPv6-capable proxy connection setup. I replaced that snippet with a direct `socks.create_connection()` example using an IPv6 proxy address.

## Review Notes
- The post now uses `2001:db8::1` only as documentation-prefix syntax in one `curl` example. Readers still need to replace it with a reachable IPv6 host for a live connectivity test.
- In Dante, `external.protocol: ipv6` must appear before `external: <interface>` when using an interface name and restricting the address family; the updated example now reflects that documented ordering.
- End-to-end runtime validation was not possible in this environment because `danted` and the `socks` Python module are not installed locally.
