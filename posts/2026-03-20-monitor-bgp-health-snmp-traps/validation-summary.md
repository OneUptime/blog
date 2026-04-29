# Validation Summary: How to Monitor BGP Session Health with SNMP Traps

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- BGP (Border Gateway Protocol)
- SNMP (v2c and v3)
- BGP4-MIB (RFC 4273)
- Cisco IOS SNMP configuration
- Net-SNMP (snmpwalk, snmpget, snmptrapd)
- Bash scripting for trap handling

## Sources Consulted
- [RFC 4273 — Definitions of Managed Objects for BGP-4](https://datatracker.ietf.org/doc/html/rfc4273)
- [Net-SNMP snmptrapd.conf manual](http://www.net-snmp.org/docs/man/snmptrapd.conf.html)
- Cisco IOS SNMP command reference (snmp-server host, snmp-server enable traps, snmp-server user)

## Issues Found
No technical issues found.

Specific items verified:
- BGP4-MIB is correctly attributed to RFC 4273.
- `bgpPeerState` enumeration values (1=idle, 2=connect, 3=active, 4=opensent, 5=openconfirm, 6=established) match the MIB definition.
- `bgpPeerTable` OID `1.3.6.1.2.1.15.3` is correct (`{ mib-2 15 3 }`).
- Cisco IOS commands (`snmp-server community`, `snmp-server host`, `snmp-server enable traps bgp`, `snmp-server trap-source`, `snmp-server engineID local`) all use valid syntax.
- SNMPv3 user creation syntax (`snmp-server user ... v3 auth sha ... priv aes 128 ...`) and SNMPv3 trap host syntax (`snmp-server host ... version 3 priv ...`) are correct.
- Net-SNMP `authCommunity TYPES COMMUNITY` and `traphandle OID PROGRAM` directives in snmptrapd.conf are valid per Net-SNMP documentation.
- `snmpwalk -v2c -c <community> <ip> 1.3.6.1.2.1.15.3` correctly walks the bgpPeerTable.
- `BGP4-MIB::bgpPeerState.<peer-ip>` is the correct symbolic form for fetching a specific peer's state.

## Review Notes
- RFC 4273 technically deprecates `bgpEstablished` and `bgpBackwardTransition` in favor of `bgpEstablishedNotification` and `bgpBackwardTransNotification` (the new names add `bgpPeerRemoteAddr` to the varbinds). However, Cisco IOS continues to emit traps under the deprecated names, so the post's usage matches real-world Cisco behavior.
- The trap-handler script greps for `bgpPeerRemoteAddr` in the trap data. The exact varbind format depends on snmptrapd output formatting and the IOS version emitting the trap; readers may need to adapt the parsing (e.g., extracting the peer IP from the index of `bgpPeerLastError.<a.b.c.d>`) for their environment. The script is illustrative and would benefit from a note to that effect, but it is not technically incorrect.
- SHA-1 and AES-128 are acceptable for compatibility; modern deployments may prefer SHA-256/AES-256 where supported by IOS.
- The example engine ID `0102030405060708` (8 octets) satisfies RFC 3411's 5–32 octet range and Cisco's hex string requirement.
- On modern Debian/Ubuntu, `snmptrapd` is available as its own package, so `apt-get install snmptrapd` works; readers on other distributions may need `net-snmp` or `snmpd` packages instead.
