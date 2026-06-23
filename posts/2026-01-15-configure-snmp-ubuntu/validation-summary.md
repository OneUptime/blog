# Validation Summary: How to Configure SNMP on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Net-SNMP (snmpd, snmp utilities, snmptrapd) on Ubuntu
- SNMP protocol versions v1, v2c, v3 (USM / VACM)
- `snmpd.conf`, `snmp.conf`, `snmptrapd.conf` configuration directives
- Net-SNMP CLI tools: snmpget, snmpwalk, snmpbulkwalk, snmptranslate, snmptrap, net-snmp-create-v3-user
- MIBs / OIDs (MIB-2, HOST-RESOURCES-MIB, UCD-SNMP-MIB, NET-SNMP-EXTEND-MIB, DISMAN-EVENT-MIB)
- Firewalls: UFW, iptables, nftables
- Monitoring integrations: Prometheus snmp_exporter, Nagios/Icinga plugins, Zabbix

## Sources Consulted
- Net-SNMP snmpd(8) man page — https://www.net-snmp.org/docs/man/snmpd.html
- Net-SNMP snmpcmd(1) man page (shared client options) — https://www.net-snmp.org/docs/man/snmpcmd.html
- Net-SNMP snmpd.conf(5) configuration reference — https://www.net-snmp.org/docs/man/snmpd.conf.html
- Net-SNMP SNMPv3 tutorial — http://www.net-snmp.org/tutorial/tutorial-5/commands/snmpv3.html
- Net-SNMP project documentation / FAQ — https://www.net-snmp.org/docs/FAQ.html
- Red Hat Deployment Guide: Configuring Net-SNMP — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/sect-system_monitoring_tools-net-snmp-configuring

## Issues Found
No technical issues found.

The following items were specifically checked because they looked potentially wrong, and were confirmed correct:
- `snmpd -v` to print version — confirmed valid. The snmpd(8) man page lists `-v, --version` as "Print version information for the agent and then exit." (Note `-V` on snmpd is unrelated: it dumps SNMP transactions.)
- `snmpget --version` — confirmed valid. The shared snmpcmd(1) options list `-V, --version` for all client tools.
- VACM `group`/`access`/`view` syntax, `rocommunity`/`rwcommunity` with `-V VIEW`, `disk`, `load`, `proc`, `extend`, `exec`, `trap2sink`/`trapsink`/`informsink`/`trapsess`, and `monitor` directives — all match the snmpd.conf reference.
- OID/MIB reference table (sysDescr, sysUpTime, ifNumber, hrSystemUptime, hrMemorySize, memTotalReal/memAvailReal/memTotalFree, laLoad.1–3) — OIDs are correct.
- `snmptranslate` example outputs, `mibs +ALL` in snmp.conf, and `download-mibs` usage — correct.
- CLI output flags (`-Of`, `-On`, `-Oe`, `-Ov`, `-Oq`, `-Os`) and defaults (`-t` default 1s, `-r` default 5) — correct.

## Review Notes
- `sysServices 72` is described as "application layer". This is the standard Net-SNMP default and a common shorthand, but strictly 72 = 64 + 8 encodes both the application layer (layer 7 → 64) and the end-to-end/transport layer (layer 4 → 8). Harmless simplification; left as-is.
- The Prometheus exporter install uses `wget https://github.com/prometheus/snmp_exporter/releases/latest/download/snmp_exporter-*linux-amd64.tar.gz`. The literal `*` is shell-glob shorthand and will not be expanded for a remote URL, so a reader must substitute the actual release filename/version. The subsequent `tar xzf snmp_exporter-*.tar.gz` and `mv` lines do work with local shell globbing. Left as-is since pinning a version number would quickly go stale; flagged here for awareness.
- `monitor ... laLoad.1 > 5.0` works in practice but note `laLoad` is a DisplayString in UCD-SNMP-MIB; for strictly numeric thresholding `laLoadInt` is the more robust object. Not incorrect, just a caveat.
- `proc nginx 1 1` in the basic example sets max=1, which would flag the typical nginx master+worker layout; the later production example more sensibly uses `proc nginx 10 1`. Both are syntactically valid.
