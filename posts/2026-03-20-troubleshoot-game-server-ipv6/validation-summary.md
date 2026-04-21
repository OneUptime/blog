# Validation Summary: How to Troubleshoot Game Server IPv6 Connectivity

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and routing
- Linux iproute2 commands (`ip`, `ss`)
- Linux IPv6 firewalling with `ip6tables`
- DNS AAAA records and lookup tools (`dig`, `nslookup`)
- IPv6 reachability testing with `ping`, `nmap`, `nc`, `traceroute6`, and `curl`
- Dual-stack address selection and Happy Eyeballs

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3587, IPv6 Global Unicast Address Format: https://datatracker.ietf.org/doc/html/rfc3587
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/html/rfc3596
- RFC 6724, Default Address Selection for IPv6: https://datatracker.ietf.org/doc/html/rfc6724
- RFC 8305, Happy Eyeballs Version 2: https://datatracker.ietf.org/doc/rfc8305/
- Linux `ip-address(8)` manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux `ss(8)` manual: https://manpages.debian.org/bookworm/iproute2/ss.8.en.html
- Linux `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `ip6tables(8)` manual: https://www.man7.org/linux/man-pages/man8/ip6tables.8.html
- Linux `iptables-save(8)` and `iptables-restore(8)` manuals: https://man7.org/linux/man-pages/man8/iptables-save.8.html and https://man7.org/linux/man-pages/man8/iptables-restore.8.html
- Nmap Reference Guide: https://nmap.org/book/man.html
- OpenBSD `nc(1)` manual: https://man.openbsd.org/nc.1
- curl man page: https://curl.se/docs/manpage.html
- Linux `gai.conf(5)` manual: https://man7.org/linux/man-pages/man5/gai.conf.5.html

## Issues Found
- Several examples used invalid IPv6 literals such as `2001:db8::gameserver`. IPv6 text fields are hexadecimal, so these were replaced with the valid documentation address `2001:db8::10`.
- The post listed `2001:db8::` as an example of an address a real server could use. `2001:db8::/32` is reserved for documentation and should not be used in production, so the text now asks for a routable global unicast address and notes that documentation addresses must be replaced.
- The outbound connectivity check used `ping6`. Current Linux `ping` supports IPv6 via `ping -6`, so both examples were updated.
- The firewall testing sequence did not actually restore the previous firewall rules and could leave the host with an unintended INPUT policy and incomplete allow rules. It now saves the rules with `ip6tables-save`, inserts a temporary allow rule, and restores the saved rules with `ip6tables-restore`.
- The UDP `nmap -sU` example was missing elevated privileges, which are generally needed for non-connect scan types. It now uses `sudo`.
- The TCP `nc` test established a normal connection instead of using netcat's scan mode. It now uses `-z` with `-w` for a simple port probe.
- The Happy Eyeballs note referenced RFC 6555 as current. It now references RFC 8305 and notes RFC 6555 as the earlier specification.
- The `gai.conf` command appended a single precedence line, but glibc disables the default precedence table when any precedence line is present. It was replaced with guidance to edit the full precedence table and keep native IPv6 above IPv4-mapped IPv6 addresses.
- The router forwarding example used the same invalid IPv6 placeholder and lacked `sudo`; both were corrected.
- The DHCPv6 renewal note implied all expired or deprecated IPv6 addresses should be renewed with `dhclient`. It now clarifies that this applies only when the address came from DHCPv6.

## Review Notes
- `ip6tables` commands are technically valid, but many modern Linux systems manage firewall policy through nftables, firewalld, ufw, or a cloud firewall. Future revisions could add a short note to use the system's active firewall manager.
- UDP port scans often report `open|filtered` when no response is received, so game-server UDP troubleshooting may need packet captures or application logs for confirmation.
- Binding to `[::]` can be IPv6-only or dual-stack depending on the application and the `IPV6_V6ONLY` socket setting; the post's "possibly dual-stack" wording is accurate.
