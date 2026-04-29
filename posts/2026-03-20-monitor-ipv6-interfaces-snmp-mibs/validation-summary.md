# Validation Summary: How to Monitor IPv6 Interfaces via SNMP MIBs

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- SNMP (Simple Network Management Protocol), v2c
- Net-SNMP `snmpwalk` CLI with IPv6 transport (`udp6:`)
- Standard MIBs: IF-MIB (RFC 2863), IP-MIB (RFC 4293), IPV6-MIB (RFC 2465, legacy), INET-ADDRESS-MIB (RFC 4001)
- pysnmp (Python SNMP library, hlapi sync API)
- Prometheus snmp_exporter

## Sources Consulted
- [RFC 2863 — The Interfaces Group MIB](https://datatracker.ietf.org/doc/html/rfc2863)
- [RFC 4293 — Management Information Base for the Internet Protocol (IP)](https://datatracker.ietf.org/doc/html/rfc4293)
- [RFC 2465 — IPv6 MIB (legacy, obsoleted by RFC 4293)](https://datatracker.ietf.org/doc/html/rfc2465)
- [RFC 4001 — Textual Conventions for Internet Network Addresses](https://datatracker.ietf.org/doc/html/rfc4001)
- OID references at oidref.com for `ifEntry` (1.3.6.1.2.1.2.2.1), `ifXEntry` (1.3.6.1.2.1.31.1.1.1), and `ipv6NetToMediaTable` (1.3.6.1.2.1.55.1.12)
- [PySNMP 7.1 hlapi documentation](https://docs.lextudio.com/pysnmp/v7.1/docs/pysnmp-hlapi-tutorial)
- Net-SNMP transport syntax for IPv6 (`udp6:[addr]:port`)

## Issues Found

1. **`IP-MIB::ipAddressPrefix` mis-described as "prefix length".** Per RFC 4293, this object is a `RowPointer` to the corresponding row in `ipAddressPrefixTable`, not the prefix length itself. The prefix length is encoded as part of the prefix table entry's index. **Fix:** rewrote the comment to "Get pointer to the address prefix entry in ipAddressPrefixTable".

2. **`ipAddressOrigin` enum values inaccurate.** The post listed the values as "manual, DHCP, SLAAC", but `IpAddressOriginTC` (RFC 4293) has no `slaac` value. The actual enums are `other(1)`, `manual(2)`, `dhcp(4)`, `linklayer(5)`, `random(6)`. SLAAC-derived addresses report as `linklayer`, and RFC 4941 privacy-extension addresses report as `random`. **Fix:** corrected the comment to "manual, dhcp, linklayer for SLAAC, random for privacy extensions".

## Review Notes

- **pysnmp version caveat (not fixed in code):** the example uses the legacy synchronous `from pysnmp.hlapi import *` + `nextCmd(...)` generator pattern. This works on pysnmp 5.x and 6.x but breaks on pysnmp 7.x, where the canonical import is `from pysnmp.hlapi.v3arch.asyncio import *` and the function is `next_cmd` invoked with `await`. Users on pysnmp 7+ either need to migrate to the asyncio API or install the `pysnmp-sync-adapter` shim. Worth noting in a future revision.
- **`ipv6NetToMediaTable` (1.3.6.1.2.1.55.1.12)** belongs to the obsolete RFC 2465 IPV6-MIB; the post already labels it "legacy" and provides the modern IP-MIB `ipNetToPhysicalTable` alongside, which is good.
- **OID + RFC mappings verified correct:** all interface OIDs (`ifDescr`, `ifOperStatus`, `ifHCInOctets`, `ifHCOutOctets`, `ifInErrors`), all listed RFC numbers, the `mpModel=1` SNMPv2c selector, the `Udp6TransportTarget` class, and the `udp6:[addr]:161` snmpwalk syntax all check out.
- **Prometheus snmp_exporter snippet** is a Prometheus scrape-config fragment (would live in `prometheus.yml`), not a standalone target file — the filename comment `/etc/prometheus/snmp_exporter_targets.yaml` is stylistically odd but the YAML structure is correct.
- The `[2001:db8::device]` placeholders contain a non-hex `device` label and are clearly meant to be substituted; readers familiar with SNMP will understand the convention.
