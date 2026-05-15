# Validation Summary: How to Configure SNMP Traps and Trap Receiver on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Net-SNMP
- snmptrapd
- snmptrap
- SNMP traps and SNMPv2 notifications
- firewalld
- Zabbix SNMP trap processing
- Bash

## Sources Consulted
- Net-SNMP snmptrapd.conf manual: https://net-snmp.sourceforge.io/docs/man/snmptrapd.conf.html
- Net-SNMP snmptrapd manual: https://net-snmp.sourceforge.io/docs/man/snmptrapd.html
- Net-SNMP trap handling tutorial: https://www.net-snmp.org/tutorial/tutorial-5/commands/snmptrap.html
- Net-SNMP snmptrap tutorial: https://www.net-snmp.org/wiki/index.php/TUT%3Asnmptrap
- Net-SNMP snmp_config manual: https://net-snmp.sourceforge.io/docs/man/snmp_config.html
- Red Hat Enterprise Linux firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_firewalls_and_packet_filters/index
- Zabbix SNMP traps documentation: https://www.zabbix.com/documentation/7.0/en/manual/config/items/itemtypes/snmptrap

## Issues Found
- The `snmptrapd.conf` example used `doNotRetain 0`, which is not a documented Net-SNMP trap daemon token. Changed it to the valid `doNotRetainNotificationLogs no`.
- The `format2` string contained an accidental `% Agent Address` sequence. In Net-SNMP format strings, `%` starts a format specifier, so this was not a valid literal label. Removed the stray percent sign.
- The `format2` string used uppercase date/time specifiers (`%H`, `%J`, `%K`, `%L`, `%M`, `%Y`), which refer to fields from the `sysUpTime.0` varbind, not the local wall-clock date. Changed them to lowercase local-time specifiers.
- The formatted "Agent Address" field used `%A`, which applies to the SNMPv1 agent-addr field. Changed it to `%b`, the PDU source address, which works for SNMPv2 notifications.
- The trap handler only matched the textual `linkDown` name. Added a numeric OID match for `.1.3.6.1.6.3.1.1.5.3` so the example also works when traps are delivered with numeric OIDs.
- The SNMPv2 linkDown test trap used uninstanced interface object names. Updated the varbinds to interface-specific instances (`IF-MIB::ifIndex.2`, `IF-MIB::ifAdminStatus.2`, and `IF-MIB::ifOperStatus.2`).
- The remote trap example comment said "Send from a remote host" even though the command sends to the remote receiver address. Changed the comment to "Send to a remote trap receiver."

## Review Notes
- The `snmptrapd -f -Lo -C -c /etc/snmp/snmptrapd.conf` verification command is valid, but it runs a foreground trap daemon and may conflict with the systemd-managed daemon if both try to bind UDP port 162 at the same time.
- The Zabbix section assumes the Zabbix package repository is already configured and that the Perl trap receiver path exists on the target system.
