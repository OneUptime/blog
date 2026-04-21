# Validation Summary: How to Configure Split Tunneling for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 routing
- WireGuard
- wg-quick
- OpenVPN
- systemd-resolved
- Linux iproute2

## Sources Consulted
- WireGuard conceptual overview and Cryptokey Routing: https://www.wireguard.com/
- WireGuard quick start: https://www.wireguard.com/quickstart/
- wg(8) manual page for AllowedIPs syntax: https://man7.org/linux/man-pages/man8/wg.8.html
- wg-quick(8) manual page for automatic route handling and hooks: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- OpenVPN 2.6 manual for route-ipv6, push, redirect-gateway, and IPv6 configuration: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- systemd resolved.conf documentation for DNS= and Domains=: https://www.freedesktop.org/software/systemd/man/253/resolved.conf.html
- systemd-resolved routing behavior: https://www.freedesktop.org/software/systemd/man/253/systemd-resolved.html
- resolvectl documentation for per-interface DNS, domain, and default-route commands: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- RFC 3849, IPv6 documentation prefix 2001:db8::/32: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- IANA IPv6 Global Unicast Address Space registry: https://www.iana.org/assignments/ipv6-unicast-address-assignments/ipv6-unicast-address-assignments.xhtml
- Pro Custodibus WireGuard AllowedIPs calculator link referenced by the post: https://www.procustodibus.com/blog/2021/03/wireguard-allowedips-calculator/

## Issues Found
- Several IPv6 examples used invalid address text such as `fd00:wg::2`, `fd00:internal::/48`, `2001:db8:office::/48`, and `fd00:internal::server`. IPv6 hextets must be hexadecimal, so these were replaced with valid example ULA and documentation-prefix addresses.
- The WireGuard `AllowedIPs` example used an invalid multiline continuation form. It was changed to a valid comma-separated `AllowedIPs` line.
- The `2000::/3` example implied it could route "everything except" arbitrary subnets. It now states that `2000::/3` is IANA's assignable global unicast block and that exact prefix subtraction is needed for true exclusions.
- The OpenVPN client example included `tun-ipv6`, which current OpenVPN documentation only keeps for older-client compatibility via `server-ipv6`. It was removed from the modern client example.
- The OpenVPN server text called global pushed routes "per-client routes". It now describes them as pushed routes to clients.
- The systemd-resolved example used a global `resolved.conf` DNS setting, which can also be considered for unmatched queries. It now uses link-scoped `resolvectl` commands with route-only domains and `default-route` set to false.
- The WireGuard calculator snippet was marked as `bash` even though it shows configuration directives. It was changed to an `ini` fence.
- The WireGuard route-injection script had the shebang after a comment and did not explain the `wg-quick` automatic route interaction. The shebang was moved first, and the hook example now notes use with `Table = off`.

## Review Notes
The examples use RFC 3849 documentation IPv6 space (`2001:db8::/32`) and RFC 4193-style ULA space, so readers must replace them with real assigned prefixes before deploying. The `traceroute6` command is common on Linux systems but may be packaged as `traceroute -6` on some distributions.
