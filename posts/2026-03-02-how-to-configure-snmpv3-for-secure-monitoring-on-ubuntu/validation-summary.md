# Validation Summary: How to Configure SNMPv3 for Secure Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Net-SNMP / snmpd
- SNMPv3 USM security
- UFW and iptables firewall rules
- Nagios / Icinga SNMP checks
- Prometheus snmp_exporter

## Sources Consulted
- Net-SNMP snmpd.conf manual: https://www.net-snmp.org/docs/man/snmpd.conf.html
- Net-SNMP snmpcmd manual: https://net-snmp.sourceforge.io/docs/man/snmpcmd.html
- Ubuntu snmpusm manual: https://manpages.ubuntu.com/manpages/stonking/man1/snmpusm.1.html
- Ubuntu snmpd.conf manual: https://manpages.ubuntu.com/manpages/noble/man5/snmpd.conf.5.html
- Debian net-snmp-create-v3-user source: https://sources.debian.org/src/net-snmp/5.9.4%2Bdfsg-2/net-snmp-create-v3-user.in/
- Debian net-snmp-create-v3-user manual: https://manpages.debian.org/unstable/snmpd/net-snmp-create-v3-user.1.en.html
- RFC 3411, SNMP architecture and security levels: https://www.rfc-editor.org/rfc/rfc3411
- RFC 3414, SNMPv3 User-based Security Model: https://www.rfc-editor.org/rfc/rfc3414
- Prometheus snmp_exporter documentation: https://github.com/prometheus/snmp_exporter
- Prometheus snmp_exporter generator documentation: https://github.com/prometheus/snmp_exporter/blob/main/generator/README.md
- Prometheus snmp_exporter releases: https://github.com/prometheus/snmp_exporter/releases

## Issues Found
- The user creation text incorrectly described when the persistent user database is written and implied `/var/lib/snmp/snmpd.conf` immediately contained hashed `createUser` credentials. Updated it to explain that the persistent file should be modified while `snmpd` is stopped, that `createUser` lines can contain passphrases before `snmpd` starts, and that Net-SNMP rewrites them as localized USM keys afterward.
- The restricted view example defined a `restricted` view but did not apply it to `monitoruser`. Updated the `rouser` line to use `-V restricted` and removed the invalid commented `access` example.
- The AgentX directives were described as performance tuning. Updated the comment to describe AgentX as subagent support.
- The noAuthNoPriv and authNoPriv test commands would fail with the configured `rouser monitoruser priv` access rule. Replaced them with a note that lower security levels should fail unless explicitly configured.
- The `snmpusm passwd` examples used a read-only user and incorrect auth/privacy key-change syntax. Updated them to use `adminuser` and the correct `-Ca` / `-Cx` options with the target user argument.
- The Nagios service example referenced `$ARG1$` and `$ARG2$` in the command definition but did not pass those arguments from the service. Updated `check_command` to include the auth and privacy passphrases.
- The snmp_exporter install command used outdated version `0.26.0`. Updated it to `0.30.1`, verified the release asset URL, and clarified that the SNMPv3 auth should be added to a generated or default `snmp.yml`.

## Review Notes
- The Net-SNMP commands and configuration now align with current Ubuntu/Net-SNMP behavior. The article still uses command-line passphrases for tutorial clarity; in production, operators should prefer protected config files, resource macros, or environment-variable expansion where supported.
