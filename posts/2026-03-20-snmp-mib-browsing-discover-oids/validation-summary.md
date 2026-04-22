# Validation Summary: How to Set Up SNMP MIB Browsing to Discover Available OIDs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SNMP
- Net-SNMP command-line tools (`snmpwalk`, `snmpget`, `snmptranslate`)
- SNMP MIB and OID browsing
- SNMPv2-MIB, IF-MIB, UCD-SNMP-MIB, and BGP4-MIB
- Linux package management with `apt` and `dnf`

## Sources Consulted
- Net-SNMP `snmpwalk` manual: https://www.net-snmp.org/docs/man/snmpwalk.html
- Net-SNMP `snmpcmd` manual for common options such as `-v`, `-c`, `-m`, `-M`, and `-On`: https://www.net-snmp.org/docs/man/snmpcmd.html
- Net-SNMP `snmpget` manual: https://www.net-snmp.org/docs/man/snmpget.html
- Net-SNMP `snmptranslate` manual: https://www.net-snmp.org/docs/man/snmptranslate.html
- Net-SNMP IF-MIB reference for `ifTable`: https://www.net-snmp.org/mibs/interfaces.html
- Net-SNMP UCD-SNMP-MIB reference for CPU, memory, and disk OID subtrees: https://www.net-snmp.org/docs/mibs/ucdavis.html
- IETF RFC 3418 for SNMPv2-MIB system objects: https://www.rfc-editor.org/rfc/rfc3418.html
- IETF RFC 4273 for BGP4-MIB: https://datatracker.ietf.org/doc/rfc4273/
- Ubuntu package metadata for `snmp-mibs-downloader` and `tkmib`: https://packages.ubuntu.com/noble/snmp-mibs-downloader and https://packages.ubuntu.com/tkmib
- Fedora package metadata for `net-snmp-utils`: https://packages.fedoraproject.org/pkgs/net-snmp/net-snmp
- SourceForge project page for snmpB: https://sourceforge.net/projects/snmpb/

## Issues Found
- The introduction described MIBs as "databases of OIDs." Changed this to "collections of OID definitions" because MIBs define managed objects and their metadata rather than serving as the device's runtime data store.
- The broad `snmpwalk` examples omitted an OID while describing a full tree walk. Net-SNMP walks `mib-2` by default when no OID is supplied, so the examples and wording were updated to walk `.1.3` for broader discovery.
- The `snmptranslate` example for finding the numeric OID of `IF-MIB::ifOperStatus` was missing `-On`, which is required for numeric OID output. Added `-On`.
- The GUI MIB browser example used `mbrowse`, which is not available in the current Ubuntu package metadata checked locally. Replaced it with `tkmib`, the Net-SNMP MIB browser available in Ubuntu.
- The vendor MIB example used `-m VENDOR-MIB`, which replaces the default MIB load list. Changed it to `-m +VENDOR-MIB` so the vendor module is loaded in addition to the defaults.
- The key takeaway that `snmpwalk` discovers "all available OIDs" was too broad because results are limited by the walked subtree and the agent's SNMP view/access control. Updated the wording.
- The claim that standard interface OIDs are consistent across all SNMP-capable devices was narrowed to devices that implement the corresponding standard MIB.

## Review Notes
- The SNMP v2c examples are syntactically valid, but production environments should prefer SNMPv3 where credentials and privacy requirements matter.
- Human-readable MIB names depend on installed and loaded MIB modules; numeric OIDs remain useful when MIB loading is incomplete.
- UCD-SNMP CPU raw counters under `1.3.6.1.4.1.2021.11` generally need rate calculations for monitoring dashboards.
