# Validation Summary: How to Configure PowerDNS to Listen on IPv6 Addresses

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- PowerDNS Authoritative Server (`pdns_server`)
- PowerDNS Recursor (`pdns_recursor`)
- IPv6 / DNS
- `pdns_control` and `rec_control`
- PowerDNS HTTP API
- `ss` / `netstat` / `dig`
- `ip6tables` (iptables-persistent)
- systemd

## Sources Consulted
- [PowerDNS Authoritative Server Settings](https://doc.powerdns.com/authoritative/settings.html)
- [PowerDNS Recursor Settings](https://doc.powerdns.com/recursor/settings.html)
- [PowerDNS Recursor Upgrade Guide](https://doc.powerdns.com/recursor/upgrade.html) (deprecation of `query-local-address6` in 4.4)
- [`pdns_server` manpage](https://doc.powerdns.com/authoritative/manpages/pdns_server.1.html) (`--config=check` syntax)
- [`pdns_recursor` manpage](https://doc.powerdns.com/recursor/manpages/pdns_recursor.1.html) (`--config=check` since 4.8.0)
- [PowerDNS issue #9435](https://github.com/PowerDNS/pdns/issues/9435) (history of `--config=check` for the recursor)

## Issues Found

1. **Invalid IPv6 address placeholders.** The post used `2001:db8::secondary-ns` and `2001:db8::primary-ns` as example IPv6 addresses. The substrings `secondary-ns`/`primary-ns` are not valid hexadecimal and would fail to parse. Replaced with valid documentation-range addresses (`2001:db8::1` and `2001:db8::2`).

2. **Wrong configuration-check flag.** The post used `pdns_server --config-check` and `pdns_recursor --config-check`. According to the official PowerDNS manpages, the correct syntax is `--config=check` (with an equals sign, as a value to the `--config` option). Updated both invocations and noted that the recursor support requires 4.8.0+.

3. **Deprecated `query-local-address6` setting.** The post set `query-local-address6=::` for the Recursor. As of PowerDNS Recursor 4.4.0 this setting is deprecated in favour of `query-local-address`, which now accepts both IPv4 and IPv6 entries. Replaced with a single `query-local-address=0.0.0.0, ::` line and added a comment noting the deprecation.

4. **Wrong path for saved ip6tables rules.** The post wrote `/etc/ip6tables/rules.v6`. The `iptables-persistent` package on Debian/Ubuntu stores both v4 and v6 rules under `/etc/iptables/`, so the correct path is `/etc/iptables/rules.v6`. Fixed the path and added a clarifying comment.

## Review Notes
- The `local-address=0.0.0.0, ::` syntax is valid; PowerDNS accepts comma- or whitespace-separated address lists for both Authoritative and Recursor.
- `allow-from=...` correctly accepts mixed IPv4 and IPv6 CIDRs in the Recursor; the `fd00::/8` example is acceptable shorthand for the commonly used Unique Local Address subset (the formally reserved ULA prefix per RFC 4193 is `fc00::/7`).
- `pdns_control show '*'` is supported by the Authoritative server to dump all statistics; `rec_control get-all` is the correct equivalent for the Recursor.
- The default API/webserver port `8081` and the path `/api/v1/servers/localhost/statistics` are correct for PowerDNS 4.x and 5.x.
- The `dig SOA example.com @::1` form is correct; users on systems where the loopback is bound only to `::1` may want to add `-6` for clarity, but the address-form `@::1` already forces IPv6.
