# Validation Summary: How to Configure SNMPv2c on a Cisco Router or Switch

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- SNMP / SNMPv2c protocol
- Cisco IOS CLI configuration
- Standard and named IP access-lists (ACLs)
- Net-SNMP CLI tools (`snmpget`, `snmpwalk`)
- IF-MIB OIDs (`ifDescr`, `ifOperStatus`, `ifInOctets`, `ifOutOctets`)

## Sources Consulted
- Cisco IOS SNMP Configuration Guide — `snmp-server enable traps` command reference (https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/configuration/15-mt/snmp-15-mt-book.html)
- Cisco IOS Master Command Reference — `snmp-server community`, `snmp-server host`, `snmp-server trap-source`, `snmp-server engineID` (https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/mcl/allreleasemcl/all-book.html)
- RFC 1213 (MIB-II) and RFC 2863 (IF-MIB) for interface OIDs
- RFC 1901–1908 (SNMPv2c) for protocol behavior and community-based security
- Net-SNMP `snmpget(1)` / `snmpwalk(1)` man pages

## Issues Found

1. **Incorrect `snmp-server enable traps` syntax for link traps** — The post had:
   ```
   snmp-server enable traps linkdown
   snmp-server enable traps linkup
   ```
   In Cisco IOS, `linkup` and `linkdown` are sub-options of the `snmp` notification type, not standalone notification types. They must be enabled via `snmp-server enable traps snmp linkdown linkup`. Fixed by combining authentication, linkdown, and linkup under a single `snmp-server enable traps snmp ...` command, leaving `bgp` and `ospf` (which are valid standalone notification types) on their own lines.

2. **Misleading Step 4 title and contradictory `trap-source` command** — Step 4 was titled "Limit SNMP to Specific Interfaces" and began with `snmp-server trap-source GigabitEthernet0/0`, accompanied by the comment "Only respond to SNMP queries on the management interface." This was wrong on two counts:
   - `snmp-server trap-source` sets the source interface for *outgoing* SNMP traps; it does not restrict which interfaces accept incoming SNMP queries.
   - It contradicted Step 3, which set `snmp-server trap-source Loopback0`.

   The remaining commands in the section actually restrict access by *source IP* via a named ACL, not by interface. Renamed the section to "Restrict SNMP Access With a Named ACL", removed the misleading `trap-source` line, and added an `exit` to leave the named-ACL configuration sub-mode before applying the ACL to the community.

## Review Notes

- **`ifInOctets` / `ifOutOctets` are 32-bit counters** — On high-speed interfaces (≥ ~20 Mbps with ifInOctets, faster for ifOutOctets) these counters wrap quickly. For modern monitoring, the 64-bit High-Capacity counters `ifHCInOctets` and `ifHCOutOctets` (RFC 2233/2863) are preferred. The post's choice is acceptable for an introductory guide but a future revision could mention this caveat.
- **Engine ID in Step 7** — The SNMP Engine ID is primarily an SNMPv3 concept (used for v3 authoritative-engine identification and timeliness checks). It is not used by SNMPv2c at the protocol level, so setting it in a v2c-only deployment offers little practical benefit. The command syntax shown is valid (Cisco accepts hex strings of 5–32 octets for the local engine ID), so no change was made, but readers should not expect this to affect v2c behavior.
- **`snmp-server community public RO`** is shown as an example before being replaced with a stronger string. The narrative makes the security implication clear, but operators copy-pasting the first example verbatim could leave a `public` community on the device. The follow-up recommendation to use a stronger community is correct.
- **Cleartext community strings** — The security note correctly warns that SNMPv2c community strings traverse the network in cleartext; the recommendation to prefer SNMPv3 in the conclusion is accurate.
