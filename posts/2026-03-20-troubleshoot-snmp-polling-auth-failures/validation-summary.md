# Validation Summary: How to Troubleshoot SNMP Polling Timeouts and Authentication Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- SNMP (v1, v2c, v3)
- Net-SNMP CLI tools (`snmpget`)
- Cisco IOS (SNMP configuration, debug, syslog)
- Linux networking tools (`tcpdump`, `nc`, `nmap`)
- CISCO-PROCESS-MIB (cpmCPUTotal5minRev OID)

## Sources Consulted
- [Cisco IOS Debug Command Reference (debug snmp packet)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/s1/db-s1-cr-book/db-s1.html)
- [Cisco SNMP Configuration Guide, IOS XE (SNMPv3 / snmp-server user)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/configuration/xe-3se/3850/snmp-xe-3se-3850-book/nm-snmp-snmpv3.html)
- [Cisco AES/3-DES Encryption Support for SNMPv3](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/configuration/xe-3se/3850/snmp-xe-3se-3850-book/nm-snmp-encrypt-snmp-support.html)
- [Cisco: Collect CPU Utilization on Cisco IOS Devices with SNMP](https://www.cisco.com/c/en/us/support/docs/ip/simple-network-management-protocol-snmp/15215-collect-cpu-util-snmp.html)
- [OID reference for 1.3.6.1.4.1.9.9.109.1.1.1.1.8 (cpmCPUTotal5minRev)](https://oidref.com/1.3.6.1.4.1.9.9.109.1.1.1.1.8)
- Net-SNMP `snmpget(1)` man page (flags `-v`, `-c`, `-l`, `-u`, `-a`, `-A`, `-x`, `-X`, `-d`)
- RFC 3414 (User-based Security Model for SNMPv3)

## Issues Found
- **README.md line 74** — The Cisco IOS syslog mnemonic for an SNMP authentication failure (wrong community string) was incorrectly shown as `%SNMP-3-AUTHERR: Packet received from 192.168.1.100 on illegal community name`. The canonical Cisco IOS mnemonic and message format is `%SNMP-3-AUTHFAIL: Authentication failure for SNMP req from host <ip>`. Fixed to match official Cisco system message format.

## Review Notes
- `debug snmp packets` is shown in the post; Cisco's authoritative command reference lists `debug snmp packet` (singular). Most IOS versions accept both forms, so this was left as-is.
- The numeric OID `1.3.6.1.4.1.9.9.109.1.1.1.1.8.1` and the MIB name `CISCO-PROCESS-MIB::cpmCPUTotal5minRev.7` refer to the same column (`cpmCPUTotal5minRev`) but different row indices; this is acceptable since the post presents them as alternative OIDs to try.
- SNMPv3 password examples (`AuthPass@2026!`, `PrivPass@2026!`) are 14 characters, satisfying the 8-character minimum required by SNMPv3 / Cisco IOS.
- `nc -uzv` as a UDP probe is known to be unreliable (UDP has no handshake); it is mentioned alongside `nmap -sU`, which is the more authoritative check. This is a practical caveat rather than a technical error.
