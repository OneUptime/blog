# Validation Summary: How to Use SNMP over IPv6 with Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- PySNMP
- SNMPv2c
- SNMPv3
- IPv6
- IP-MIB / IPv6 MIBs

## Sources Consulted
- PySNMP 7.1 Common Operations with High-Level API: https://docs.lextudio.com/pysnmp/v7.1/docs/pysnmp-hlapi-tutorial
- PySNMP 7.1 API Reference: https://docs.lextudio.com/pysnmp/v7.1/docs/api-reference
- PySNMP upgrade notes for 6.x/7.x: https://docs.lextudio.com/pysnmp/v7.1/upgrade.html
- PyPI project page for `pysnmp`: https://pypi.org/project/pysnmp/
- PyPI project page for `pysnmp-mibs`: https://pypi.org/project/pysnmp-mibs/
- RFC 4293, Management Information Base for the Internet Protocol (IP): https://www.rfc-editor.org/rfc/rfc4293.txt
- RFC 2465, Management Information Base for IP Version 6: Textual Conventions and General Group: https://www.rfc-editor.org/rfc/rfc2465.txt
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.txt
- Cisco `CISCO-BGP4-MIB`: https://raw.githubusercontent.com/cisco/cisco-mibs/main/v2/CISCO-BGP4-MIB.my

## Issues Found
- The post used the removed legacy `pysnmp.hlapi` one-liner API (`getCmd`, `nextCmd`, direct `UdpTransportTarget(...)`). Current supported PySNMP 7.1 documents the asyncio HLAPI instead, so the examples were updated to `pysnmp.hlapi.v3arch.asyncio` with `get_cmd`, `walk_cmd`, and `Udp6TransportTarget.create(...)`.
- The original examples used invalid IPv6 literals such as `2001:db8::router` and `2001:db8::switch1`. These were replaced with valid documentation addresses inside `2001:db8::/32`.
- The IPv6 MIB section incorrectly labeled legacy RFC 2465 objects as IP-MIB objects and used an incorrect object name/OID pair for the physical address column. This was corrected to `ipv6IfPhysicalAddress` at `1.3.6.1.2.1.55.1.5.1.8`, and the text now distinguishes RFC 4293 IP-MIB from legacy RFC 2465 IPv6 MIB tables.
- The conclusion said to use `nextCmd` for WALK operations. In current PySNMP 7.1 documentation, `walk_cmd` is the supported WALK helper, so the post was corrected accordingly.
- The SNMPv3 helper was annotated as returning `str | None` but returned formatted error strings on failure. It now reports errors consistently and returns `None`, matching the annotation.

## Review Notes
- RFC 4293 obsoletes RFC 2465, so `ipAddressTable` is the current standards-track table for IP address data. The legacy `1.3.6.1.2.1.55.*` IPv6 tables are still worth mentioning because some deployed devices still expose them.
- The `pip install pysnmp pysnmp-mibs` command is valid as written.
- After the fixes, all Python code blocks in the post compile successfully.
