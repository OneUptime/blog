# Validation Summary: How to Configure OpenLDAP to Listen on IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenLDAP (slapd daemon)
- LDAP / LDAPS / LDAPI URL syntax
- IPv6 networking
- systemd service overrides
- slapd ACL syntax (slapd.conf and cn=config / OLC styles)
- ldapsearch / ldapmodify CLI tools
- iptables-persistent (ip6tables) for IPv6 firewalling
- ss (socket statistics) for port verification
- cn=Monitor backend for connection monitoring
- journalctl for log inspection

## Sources Consulted
- OpenLDAP slapd.access(5) man page — https://www.openldap.org/software/man.cgi?query=slapd.access&sektion=5 (peername style: `ip` for IPv4, `ipv6` for IPv6; mask uses `%` separator with mask in textual IPv6 form, not CIDR)
- OpenLDAP Admin Guide, Access Control — https://www.openldap.org/doc/admin26/access-control.html
- OpenLDAP Admin Guide, Monitoring slapd — https://www.openldap.org/doc/admin24/monitoringslapd.html (confirms `cn=Current,cn=Connections,cn=Monitor` path)
- ldapsearch(1) man page (OpenLDAP client tools) — `-x` is required for simple authentication; SASL is the default mechanism
- Debian iptables-persistent / netfilter-persistent package — confirmed IPv6 rules path is `/etc/iptables/rules.v6`
- slapd(8) man page — `-h` URL list, `-d 0` keeps slapd in foreground without debug output (suitable for systemd Type=simple units), `-VV` prints version + backends

## Issues Found

1. **Incorrect ACL syntax for IPv6 peer matching** — The post used `peername.ip="2001:db8::/32"` which is wrong on two counts. Per slapd.access(5), the `ip` style is for IPv4 addresses only; the `ipv6` style must be used for IPv6 addresses. Additionally, the IPv6 mask is not specified in CIDR notation (`/32`); it must be a bitwise-AND mask in IPv6 textual form, separated from the address by `%`. Fixed all three occurrences (one in slapd.conf example, two in the cn=config LDIF) by changing them to `peername.ipv6="2001:db8::%ffff:ffff::"`. The mask `ffff:ffff::` represents the first 32 bits set (equivalent to a /32 prefix).

2. **Missing `-x` flag in first ldapsearch example** — The first `ldapsearch` command used `-D dn -w password` without `-x`. ldapsearch defaults to SASL authentication; `-w` only supplies a password and does NOT switch the bind mechanism. Without `-x`, the bind would attempt SASL and likely fail. Added the `-x` flag for consistency with the other (correct) ldapsearch examples in the post.

3. **Wrong iptables-persistent rules path** — The post wrote saved rules to `/etc/ip6tables/rules.v6`. The `iptables-persistent` package (and its successor `netfilter-persistent`) on Debian/Ubuntu reads from `/etc/iptables/rules.v6` (both v4 and v6 live under `/etc/iptables/`). Corrected the path.

## Review Notes
- The `-d 0` flag in the systemd ExecStart for the RHEL/CentOS override is correct — it keeps slapd in foreground without producing debug output, suitable for systemd unit management. Older slapd versions / different systemd unit types might not need this, but it is harmless.
- On RHEL 8/9, the `openldap-servers` package was deprecated and is no longer in default repositories — users may need Symas builds or alternative sources. Not corrected because this is a packaging caveat outside the post's scope.
- The `ldap:///` URL on a dual-stack Linux system effectively listens on both IPv4 and IPv6 via IPv4-mapped IPv6 sockets in many distributions, but explicitly listing `ldap://[::]/` is clearer and is what the post recommends — that is good practice.
- The `grep "::ffff\|2001\|fd"` pattern uses GNU grep's basic-regex alternation (`\|`), which is a GNU extension. It works on the Linux distros the post targets but is non-portable. Left as-is since GNU grep is the assumed environment.
