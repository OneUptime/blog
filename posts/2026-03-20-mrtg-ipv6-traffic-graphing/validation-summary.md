# Validation Summary: How to Configure MRTG for IPv6 Traffic Graphing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MRTG (Multi Router Traffic Grapher)
- Net-SNMP (snmpget, SNMPv2c, SNMPv3)
- IPv6 transport for SNMP (udp6)
- IP-MIB (RFC 4293) and IF-MIB (RFC 2863) OIDs
- Nginx (IPv6 listener)
- cron / systemd scheduling
- Ubuntu/Debian packaging

## Sources Consulted
- MRTG official documentation and reference (oss.oetiker.ch/mrtg)
- cfgmaker(1) and indexmaker(1) man pages
- mrtg-reference, mrtg-ipv6 documentation
- Net-SNMP snmpcmd(1) and snmpget(1) man pages (for `udp6:[ipv6]:port` transport syntax and SNMPv3 flags)
- RFC 4293 (IP-MIB) for ipSystemStatsTable column definitions
- RFC 2863 (IF-MIB) for ifHCInOctets / ifHCOutOctets OIDs (1.3.6.1.2.1.31.1.1.1.6 and .10)
- Debian/Ubuntu mrtg package documentation

## Issues Found
- **Incorrect OID for outbound IPv6 packet counter.** In the "Custom SNMP OID over IPv6" example titled "IPv6 Packets In/Out", both OIDs were inbound counters: `1.3.6.1.2.1.4.31.1.1.3.2` is `ipSystemStatsInReceives.ipv6` and `1.3.6.1.2.1.4.31.1.1.4.2` is `ipSystemStatsHCInReceives.ipv6` (the 64-bit variant of the same inbound counter). Per RFC 4293, the matching outbound packet counter is `ipSystemStatsOutTransmits` at column 30. Changed the second OID from `1.3.6.1.2.1.4.31.1.1.4.2` to `1.3.6.1.2.1.4.31.1.1.30.2` so the target now actually represents in vs. out packets as the title claims.

## Review Notes
- The MRTG IPv6 bracket notation (`community@[2001:db8::router]`) in target lines requires MRTG to be built with IPv6 support, which is the default in current Debian/Ubuntu packages — worth noting only for users on older or custom builds, where `--enable-ipv6` at build time or explicit `udp6:` transport prefix may be needed.
- `MaxBytes: 125000000` correctly represents the byte/sec ceiling for a 1 Gbps interface even when `Options[_]: bits` is set, since MRTG always interprets MaxBytes in bytes regardless of display unit.
- Running `mrtg /etc/mrtg/mrtg.cfg` three times on first invocation to suppress the expected "log file not found" warnings is the documented MRTG behavior.
- The mixed use of 32-bit (`ipSystemStatsInReceives`) and 64-bit (`ipSystemStatsHCInReceives`/`HCOutTransmits`) counters is left to the author's discretion; for high-bandwidth links, switching both legs to the HC counters (`.4.2` and `.31.2`) would be more robust against counter wrap, but the current example with 32-bit counters remains technically valid.
- The Debian mrtg package ships its own cron entry; the manual `/etc/cron.d/mrtg` shown will coexist or replace it depending on the user's setup — readers should remove the stock cron entry if installing the custom one to avoid duplicate runs.
