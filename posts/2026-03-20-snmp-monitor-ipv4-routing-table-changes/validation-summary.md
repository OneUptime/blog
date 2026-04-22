# Validation Summary: How to Monitor IPv4 Routing Table Changes with SNMP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SNMP
- IP-FORWARD-MIB
- IPv4 CIDR routing tables
- Net-SNMP CLI tools
- Python
- PySNMP

## Sources Consulted
- RFC 4292: IP Forwarding Table MIB - https://datatracker.ietf.org/doc/html/rfc4292
- RFC 4293: Management Information Base for the Internet Protocol (IP) - https://www.rfc-editor.org/rfc/rfc4293
- Net-SNMP snmpbulkwalk man page - https://www.net-snmp.org/docs/man/snmpbulkwalk.html
- Net-SNMP snmpwalk tutorial - https://www.net-snmp.org/wiki/index.php/TUT:snmpwalk
- PySNMP 7.1 documentation - https://docs.lextudio.com/pysnmp/v7.1/
- PySNMP 7.1 walk_cmd API reference - https://docs.lextudio.com/pysnmp/v7.1/docs/hlapi/v3arch/asyncio/manager/cmdgen/walkcmd
- PySNMP 7.1 upgrade guide - https://docs.lextudio.com/pysnmp/v7.1/upgrade

## Issues Found
- The `ipCidrRouteType`, `ipCidrRouteProto`, `ipCidrRouteAge`, and `ipCidrRouteMetric1` OIDs used legacy `ipRouteTable` column numbers instead of `ipCidrRouteEntry` column numbers. Updated them to `.6`, `.7`, `.8`, and `.11` respectively.
- The protocol value examples were incorrect for `ipCidrRouteProto`: OSPF is `13`, RIP is `8`, and static routes are represented by `netmgmt(3)`. Updated the table and Python protocol map.
- The `snmpbulkwalk` example supplied two starting OIDs, but Net-SNMP walk commands only use one starting OID. Changed it to walk the route entry subtree.
- The Python example used older PySNMP-style imports and synchronous `nextCmd`/`UdpTransportTarget(...)` usage. Updated it for current PySNMP 7.1 async HLAPI with `walk_cmd()` and `UdpTransportTarget.create()`.
- The Python route index parsing used the last four OID octets as the route key, which is the indexed next-hop address in `ipCidrRouteTable`, not the route identity. Updated parsing to use the destination, mask, and TOS portions of the table index and added mask polling for CIDR-format output.
- The route count command used `ipRoutingDiscards.0`, which counts discarded routing entries rather than current routes. Replaced it with `IP-FORWARD-MIB::ipCidrRouteNumber.0`.

## Review Notes
The post intentionally uses the IPv4-specific `ipCidrRouteTable`, which RFC 4292 deprecates in favor of `inetCidrRouteTable`. The post now states that caveat. A future enhancement could add version-independent `inetCidrRouteTable` examples and SNMPv3 credentials for production use. The Python example was syntax-checked and its current PySNMP imports were verified, but it was not executed against a live SNMP router.
