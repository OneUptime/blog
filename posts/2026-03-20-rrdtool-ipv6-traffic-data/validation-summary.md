# Validation Summary: How to Configure RRDtool for IPv6 Traffic Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RRDtool
- Net-SNMP
- SNMPv2c
- IPv6
- IP-MIB
- Bash
- Python
- cron
- Ubuntu/Debian packages

## Sources Consulted
- RRDtool rrdcreate documentation: https://oss.oetiker.ch/rrdtool/doc/rrdcreate.en.html
- RRDtool rrdupdate documentation: https://www.rrdtool.org/rrdtool/doc/rrdupdate.en.html
- RRDtool rrdgraph documentation: https://oss.oetiker.ch/rrdtool/doc/rrdgraph.en.html
- RRDtool rrdgraph_data documentation: https://oss.oetiker.ch/rrdtool/doc/rrdgraph_data.en.html
- RRDtool rrdgraph_graph documentation: https://oss.oetiker.ch/rrdtool/doc/rrdgraph_graph.en.html
- RRDtool rrdgraph_rpn documentation: https://www.rrdtool.org/rrdtool/doc/rrdgraph_rpn.en.html
- Net-SNMP snmpcmd manual page: https://net-snmp.sourceforge.io/docs/man/snmpcmd.html
- Net-SNMP FAQ for IPv6 command-line target syntax: https://net-snmp.sourceforge.io/docs/FAQ.html
- Net-SNMP IP-MIB reference: https://www.net-snmp.org/docs/mibs/ip.html
- RFC 3849, IPv6 documentation prefix: https://www.rfc-editor.org/info/rfc3849
- Local Ubuntu package metadata via apt-cache for rrdtool, librrds-perl, python3-rrdtool, and snmp.

## Issues Found
- The install command omitted the Net-SNMP client package even though the examples use `snmpget`. Added the `snmp` package to the Ubuntu/Debian install command.
- The example device address `2001:db8::router1` was not a valid IPv6 literal. Changed it to `2001:db8::1`, which uses the documentation prefix from RFC 3849.
- The original SNMP OIDs used IF-MIB interface counters, which measure total interface traffic rather than IPv6-only IP traffic. Replaced them with IP-MIB `ipIfStatsTable` high-capacity counters indexed by `ipv6(2)` and interface index.
- The RRD data source names and comments described raw bytes/packets, but RRDtool `COUNTER` data sources store per-second rates derived from monotonically increasing counters. Renamed the data sources to octets/datagrams and clarified the comment.
- The shell script only checked that octet counters were non-empty and could update RRDtool with missing packet values. Added numeric validation for all four collected counters before updating the RRD.
- The Net-SNMP IPv6 target was unquoted in the shell script even though IPv6 target syntax includes square brackets. Quoted the `udp6:[address]:161` target and shell variables.
- The crontab command replaced root's existing crontab instead of adding the new entry. Changed it to preserve existing root crontab entries.
- The RRD creation example wrote under `/var/lib/rrd` without creating the directory or using elevated permissions. Added `sudo mkdir -p /var/lib/rrd` and used `sudo` for create/info commands.
- The graph example used deprecated `GPRINT:vname:CF:format` syntax. Replaced it with VDEF-based `GPRINT` syntax.
- The Python example used the same non-IPv6-specific IF-MIB counters and placeholder zero values for packet counters. Updated it to collect the same IPv6 IP-MIB octet/datagram counters as the shell example and validate all values before updating RRDtool.
- The Python helper could raise an exception if `snmpget` returned success with empty output. Added an stdout check before reading the last field.
- The closing explanation said only the SNMP target address changes for IPv6 collection. Updated it to note that IPv6-only interface statistics require IP-MIB entries indexed by `ipv6(2)`.

## Review Notes
- The examples still use SNMPv2c with a `public` community string for simplicity. In production, SNMPv3 or a non-default community with proper access controls would be safer.
- The IP-MIB `ipIfStatsTable` is the correct standard table for IPv6-only per-interface IP counters, but device support can vary by vendor and firmware.
- Local validation could not execute live `rrdtool` or `snmpget` commands because those binaries are not installed in this workspace. Shell and Python snippets were syntax-checked, and command forms were validated against official documentation.
