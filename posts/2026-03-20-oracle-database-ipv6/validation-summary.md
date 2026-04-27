# Validation Summary: How to Configure Oracle Database for IPv6 Connections

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Oracle Database (19c referenced via ORACLE_HOME path)
- Oracle Net Services (TNS Listener, listener.ora, tnsnames.ora, sqlnet.ora)
- Oracle SQL*Plus and tnsping
- Oracle JDBC Thin Driver
- IPv6 networking
- Linux iptables / ip6tables (iptables-persistent)
- ss (socket statistics)
- EZConnect connection syntax

## Sources Consulted
- Oracle Database Net Services Administrator's Guide 19c — IPv6 Support: https://docs.oracle.com/en/database/oracle/oracle-database/19/netag/configuring-ipv6-network-protocol.html
- Oracle Database Net Services Reference — listener.ora parameters: https://docs.oracle.com/en/database/oracle/oracle-database/19/netrf/
- Oracle EZConnect syntax for IPv6 (square-bracket notation): https://docs.oracle.com/en/database/oracle/oracle-database/19/netag/configuring-naming-methods.html
- RFC 4291 — IPv6 Addressing Architecture (valid hex digits 0-9, a-f only)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- RFC 3986 — URI syntax for IPv6 literals using square brackets
- Debian/Ubuntu iptables-persistent package documentation (storage paths /etc/iptables/rules.v4, rules.v6)
- iproute2 `ip` and `ss` man pages
- Oracle JDBC Developer's Guide — IPv6 connection URL bracket notation

## Issues Found

1. **Invalid IPv6 literal `2001:db8::oracle`** — IPv6 addresses are hexadecimal, so only digits 0-9 and letters a-f are permitted. The string "oracle" contains 'o', 'r', and 'l', which are not valid hex characters, so the literal would never parse. Replaced all occurrences (in `listener.ora`, `tnsnames.ora`, the SQL*Plus connect-descriptor and EZConnect examples, and the closing JDBC URL example) with the valid documentation address `2001:db8::1`.

2. **Invalid IPv6 literal `2001:db8::app-server`** — Hyphens and the letters 's', 'p', 'r', 'v' are invalid in IPv6 addresses. Replaced with `2001:db8::dba` (all valid hex digits) in the `ip6tables` rule.

3. **Invalid IPv6 prefix `2001:db8:clients::/48`** — "clients" contains characters that are not valid hex. Replaced with `2001:db8:1::/48`, a valid documentation /48 prefix.

4. **Incorrect EZConnect syntax for IPv6** — The example `sqlplus "system/password@//(2001:db8::oracle):1521/ORCL"` wrapped the IPv6 literal in parentheses. Per the Oracle Net Services Administrator's Guide and RFC 3986, IPv6 hosts in URI/EZConnect syntax must be enclosed in square brackets. Changed to `sqlplus "system/password@//[2001:db8::1]:1521/ORCL"`.

5. **Wrong path for iptables-persistent rules file** — The example saved rules to `/etc/ip6tables/rules.v6`. The Debian/Ubuntu `iptables-persistent` (and `netfilter-persistent`) package reads/writes IPv6 rules at `/etc/iptables/rules.v6` (note: the directory is `iptables`, not `ip6tables`). Corrected the redirection path.

## Review Notes
- The Oracle 11.2+ version note for IPv6 support is accurate — full IPv6 client connectivity was introduced in 11.2.
- `ENABLE_GLOBAL_DYNAMIC_ENDPOINT_LISTENER = ON` is a valid listener.ora parameter, primarily relevant for Oracle RAC SCAN listeners; including it in a non-RAC IPv6 setup is unusual but not technically incorrect.
- `ADR_BASE_LISTENER` is correctly named for a listener whose name is `LISTENER` (the parameter format is `ADR_BASE_<listener_name>`).
- The `TCP.CONNECT_TIMEOUT` parameter in sqlnet.ora is valid, although the inline comment ("Prefer IPv6 for connections") is loosely worded — the timeout setting itself does not influence v4-vs-v6 preference; that ordering is dictated by OS resolver / `gai.conf`. Left as-is since the directive itself is valid and the surrounding note clarifies the AAAA/A behaviour.
- The `ping6` utility is deprecated on modern Linux distributions in favour of `ping -6` / `ping ::1`, but `ping6` still works on most current systems. Not changed.
- `lsnrctl status` output uses lower-case `tcp` and `tcp6`-style endpoints in real Oracle output; the post's lower-case `tcp` is consistent with actual lsnrctl output, so left unchanged.
- The JDBC Thin URL example with bracketed IPv6 literal is the documented form for `oracle.jdbc.OracleDriver`.
