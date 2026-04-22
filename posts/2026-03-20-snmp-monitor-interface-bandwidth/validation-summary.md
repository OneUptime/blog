# Validation Summary: How to Use SNMP to Monitor Interface Bandwidth Utilization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SNMP
- IF-MIB / interface counters
- Net-SNMP `snmpwalk` and `snmpget`
- Python
- PySNMP
- InfluxDB Python client
- Grafana

## Sources Consulted
- RFC 2863, The Interfaces Group MIB: https://datatracker.ietf.org/doc/html/rfc2863
- IF-MIB object definitions from RFC 2863: https://www.itu.int/wftp3/Public/t/fl/ietf/rfc/rfc2863/IF-MIB.html
- PySNMP 7.1 documentation: https://docs.lextudio.com/pysnmp/v7.1/
- PySNMP v1arch asyncio GET API: https://docs.lextudio.com/pysnmp/v7.1/docs/hlapi/v1arch/asyncio/manager/cmdgen/getcmd
- PySNMP 7.1 API reference: https://docs.lextudio.com/pysnmp/v7.1/docs/api-reference
- PySNMP downloads/install documentation: https://docs.lextudio.com/pysnmp/v7.1/download
- Net-SNMP `snmpcmd` manual: https://www.net-snmp.org/docs/man/snmpcmd.html
- Net-SNMP `snmpget` manual: https://www.net-snmp.org/docs/man/snmpget.html
- Net-SNMP `snmpwalk` manual: https://www.net-snmp.org/docs/man/snmpwalk.html
- InfluxDB Python client documentation: https://github.com/influxdata/influxdb-client-python
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
- The PySNMP example used the older synchronous `pysnmp.hlapi` / `getCmd` style. Current PySNMP 7.1 documents the asyncio `get_cmd` API under `pysnmp.hlapi.v1arch.asyncio`, and older PySNMP releases are no longer supported. Updated the Python example to use `asyncio`, `get_cmd`, `SnmpDispatcher`, and `UdpTransportTarget.create()`.
- The Python example only checked `error_indication` and not SNMP PDU `error_status`. Added `error_status` handling so failed OIDs or PDU errors do not get converted blindly to integers.
- The code comment said it handled 64-bit counter wrap, but the original code subtracted counters directly and would produce a negative rate after wrap. Added a 64-bit counter delta helper and used it for inbound and outbound calculations.
- The OID table described `ifSpeed` as plain bits/sec without noting its maximum value. RFC 2863 says `ifSpeed` reports its maximum value when the interface speed exceeds what it can represent and `ifHighSpeed` must be used. Updated the `ifSpeed` description and added `ifHighSpeed`.
- The post described high-capacity counters as "for GigE+" and recommended them only above 100 Mbps. RFC 2863 defines high-capacity octet counter requirements for interfaces faster than 20 Mbps. Updated the wording to "high-speed interfaces" and noted the IF-MIB threshold.
- The `ifOperStatus` row listed only `1=up, 2=down`, but RFC 2863 defines additional operational states. Updated the text to indicate there are other values.
- The manual `snmpget` example fetched only `ifSpeed`; added `ifHighSpeed` so the command is accurate for high-speed interfaces.

## Review Notes
- The Net-SNMP commands are syntactically valid assuming IF-MIB names are available in the local MIB configuration; numeric OIDs can be used in environments where MIB loading is disabled.
- The InfluxDB snippet matches the official `influxdb-client` synchronous write API for InfluxDB 2.x. In the updated async script, this synchronous write call would still work but would block the event loop during the HTTP write.
