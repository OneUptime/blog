# Validation Summary: How to Configure SNMP Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- Net-SNMP / snmpd
- SNMPv1, SNMPv2c, and SNMPv3
- SNMP traps
- Nagios check_snmp
- Prometheus snmp_exporter
- UFW
- systemd

## Sources Consulted
- Net-SNMP snmpd tutorial: https://www.net-snmp.org/tutorial/tutorial-5/demon/snmpd.html
- Net-SNMP snmpd.conf manual: https://www.net-snmp.org/docs/man/snmpd.conf.html
- Net-SNMP SNMPv3 README: https://www.net-snmp.org/docs/README.snmpv3.html
- Ubuntu net-snmp-create-v3-user manpage for snmpd 5.9.4: https://manpages.ubuntu.com/manpages/noble/man1/net-snmp-create-v3-user.1.html
- Prometheus snmp_exporter README: https://github.com/prometheus/snmp_exporter
- Prometheus snmp_exporter latest release metadata: https://api.github.com/repos/prometheus/snmp_exporter/releases/latest
- Nagios check_snmp plugin documentation: https://nagios-plugins.org/doc/man/check_snmp.html

## Issues Found
- The `agentAddress` example claimed to listen on all interfaces but used `udp6:[::1]:161`, which only binds IPv6 loopback. Changed it to `udp:161,udp6:161` and updated the comment to say IPv4 and IPv6.
- The SNMPv3 access-control snippet referenced `authPrivUser`, while the user creation and query examples used `monitoruser`. Changed the guidance so the `net-snmp-create-v3-user` generated `rouser monitoruser` line is tightened to `authpriv -V allview`.
- The disk threshold example used `500MB`, but the Net-SNMP `disk` directive accepts kilobytes or a percentage. Changed it to `512000` KB.
- The SNMPv3 verification command grepped for `createUser` after starting `snmpd`; Net-SNMP consumes `createUser` and writes persistent `usmUser` entries. Changed the verification command to grep for `usmUser`.
- The snmp_exporter example used outdated version `0.24.1`. Updated it to the current latest release, `0.30.1`, published on 2026-01-07.
- The snmp_exporter systemd service referenced `/etc/snmp_exporter/snmp.yml`, but the install commands never created that directory or copied the bundled config. Added commands to create `/etc/snmp_exporter` and copy `snmp.yml`.

## Review Notes
The remaining examples are broadly correct for a practical Ubuntu/Net-SNMP setup. In production, readers should replace example community strings and passphrases, restrict `agentAddress` and firewall rules to monitoring networks, and prefer SNMPv3 over SNMPv2c.
