# Validation Summary: How to Use IP-MIB for IPv6 Interface Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- SNMP
- IP-MIB (RFC 4293)
- IPv6
- Net-SNMP CLI tools
- PySNMP
- Linux `ip` command (`iproute2`)

## Sources Consulted
- RFC 4293, "Management Information Base for the Internet Protocol (IP)": https://www.rfc-editor.org/rfc/rfc4293
- RFC 4001, "Textual Conventions for Internet Network Addresses": https://www.rfc-editor.org/rfc/rfc4001
- RFC 4292, "IP Forwarding Table MIB": https://www.rfc-editor.org/rfc/rfc4292.html
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation": https://www.rfc-editor.org/rfc/rfc3849.html
- Net-SNMP `snmpcmd` manual: https://www.net-snmp.org/docs/man/snmpcmd.html
- Net-SNMP IP-MIB browser: https://www.net-snmp.org/docs/mibs/ip.html
- PySNMP README: https://github.com/pysnmp/pysnmp/blob/main/README.md
- PySNMP `Udp6TransportTarget` implementation: https://raw.githubusercontent.com/pysnmp/pysnmp/main/pysnmp/hlapi/asyncore/transport.py
- PySNMP `nextCmd` implementation and options: https://raw.githubusercontent.com/pysnmp/pysnmp/main/pysnmp/hlapi/asyncore/sync/cmdgen.py

## Issues Found
- The description claimed IP-MIB could be used for routing table entries. I corrected that to neighbor mappings and statistics because route tables are defined in IP-FORWARD-MIB, not IP-MIB.
- Several example targets used invalid IPv6 literals such as `2001:db8::device`, `2001:db8::localhost`, and `2001:db8::router1`. I replaced them with valid documentation or loopback literals.
- The post treated `ipAddressAddr` as directly walkable/readable. In RFC 4293 it is a `not-accessible` index object, so I changed the examples to walk `ipAddressIfIndex` and extract the IPv6 address from the row index instead.
- The `ipAddressStatus` enumeration list was incomplete. I added the missing `tentative(6)`, `duplicate(7)`, and `optimistic(8)` values from RFC 4293.
- The IPv6 structure summary implied `broadcast` was a normal IPv6 address type and implied `ipNetToPhysicalTable` was IPv6-only. I corrected both points: `broadcast(3)` is IPv4-only, and `ipNetToPhysicalTable` covers IPv4 ARP plus IPv6 neighbor mappings.
- The PySNMP example did not actually decode IPv6 addresses from the OID index and was walking the wrong subtree for that purpose. I updated it to walk `ipAddressIfIndex`, use the current synchronous HLAPI pattern from upstream PySNMP, and decode `ipv6(2)` addresses correctly.
- The comparison example was not extracting comparable address data and was order-sensitive. I changed it to extract global IPv6 addresses from `snmpwalk -OX` output and sort both SNMP and system results before `diff`.

## Review Notes
- The examples use SNMPv2c and the `public` community string for brevity. For production monitoring, SNMPv3 is the safer default.
- Symbolic OIDs such as `IP-MIB::ipSystemStatsHCInReceives` assume the local Net-SNMP installation has the relevant MIBs available. Numeric OIDs avoid that dependency.
- The examples intentionally focus on `ipAddressAddrType = ipv6(2)`, which corresponds to global IPv6 addresses. Non-global IPv6 addresses are represented as `ipv6z(4)` rows with a zone index.
