# Validation Summary: How to Deploy NAT64 and DNS64 Together

## Status
validated

## Post Type
Guide

## Technologies Covered
- NAT64
- DNS64
- Jool
- BIND 9
- `radvd`
- IPv6 Router Advertisements
- Linux `iptables`/`ip6tables`

## Sources Consulted
- Jool installation on Ubuntu: https://www.jool.mx/en/ubuntu.html
- Jool `instance` mode reference: https://www.jool.mx/en/usr-flags-instance.html
- Jool `pool4` mode reference: https://www.jool.mx/en/usr-flags-pool4.html
- Jool `global` mode reference: https://www.jool.mx/en/usr-flags-global.html
- BIND 9 Configuration Reference (`dns64`, `allow-recursion`, `allow-query-cache`, `statistics-file`): https://bind9.readthedocs.io/en/stable/reference.html
- BIND 9 Administrator Reference Manual (`named-checkconf`): https://bind9.readthedocs.io/en/stable/
- `radvd.conf(5)` Debian man page: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052
- RFC 6146, Stateful NAT64: https://www.rfc-editor.org/rfc/rfc6146
- RFC 6147, DNS64: https://www.rfc-editor.org/rfc/rfc6147
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106
- RFC 8880, Special Use Domain Name `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc8880.html

## Issues Found
- The Jool setup used incorrect Jool 4 syntax. `jool pool6 add` is not how NAT64 `pool6` is configured in current Jool; it must be set during `jool instance add`. I changed the commands accordingly.
- The Jool `pool4` commands were incomplete. `pool4 add` requires a port range, and the IPv4-side `iptables` rules need protocol and port matching for TCP/UDP. I added the required port ranges and split the `iptables` rules by protocol.
- The BIND DNS64 example would not work as written. Appending a bare `dns64` block to the end of Debian’s `named.conf.options` places it outside the `options` block, and the original `exclude` usage was wrong for blocking private IPv4 synthesis. I replaced the snippet with a valid minimal `options` block, added recursion/cache ACLs, a stable `statistics-file`, and used `mapped` correctly.
- The client configuration section was missing the `radvd` package install, referenced obsolete RFC 6106 instead of RFC 8106, and used invalid placeholder IPv6 addresses such as `2001:db8::dns64server` and `2001:db8:clients::/64`. I corrected the package step, RFC reference, and example addresses.
- The verification section used `example.com` as an IPv4-only DNS64 test case, which is incorrect because it already has native AAAA records. I changed the DNS64 test to `ipv4only.arpa` per RFC 8880, kept NAT64 packet testing on reachable IPv4 literals, and changed the HTTP test to an IPv4-only hostname that was A-only on 2026-05-01.
- The monitoring section used a nonportable BIND stats path and a loop that tried to source packets from client addresses that would not exist on the monitoring host. I changed the stats command to the configured stats file and rewrote the loop to probe multiple synthesized destinations instead.
- The troubleshooting table had a contradictory row about getting a native AAAA record for an IPv4-only domain, and the MTU guidance incorrectly referred to a tunnel and a hard-coded MTU. I corrected those explanations.
- The prefix verification section used `jool pool6 display`, which is not the correct Jool command for NAT64 `pool6` inspection. I changed it to `jool global display | grep pool6`.

## Review Notes
- The post now aligns with current Jool 4 command syntax and BIND 9 DNS64 configuration behavior.
- The example keeps the well-known prefix `64:ff9b::/96`; if a deployment needs translation for non-global IPv4 destinations, a network-specific /96 should be used instead.
- The HTTP verification example depends on the test hostname remaining IPv4-only. On 2026-05-01, `http.badssl.com` resolved only to IPv4 in validation checks.
