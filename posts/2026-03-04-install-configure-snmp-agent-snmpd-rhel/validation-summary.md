# Validation Summary: How to Install and Configure SNMP Agent (snmpd) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Net-SNMP / snmpd
- SNMPv2c
- firewalld
- SELinux
- systemd

## Sources Consulted
- Net-SNMP snmpd.conf manual: https://net-snmp.sourceforge.io/docs/man/snmpd.conf.html
- Net-SNMP command manual index: https://www.net-snmp.org/docs/man/
- Net-SNMP snmpcmd manual: https://net-snmp.sourceforge.io/docs/man/snmpcmd.html
- Net-SNMP snmpbulkwalk manual: https://net-snmp.sourceforge.io/docs/man/snmpbulkwalk.html
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/configuring-selinux-for-applications-and-services-with-non-standard-configurations_using-selinux
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The `view systemonly included .1` line defined a VACM view but did not attach it to either `rocommunity` directive. Net-SNMP's `rocommunity` directive can take an OID or `-V VIEW`; without that, access defaults to the full OID tree. I changed the `rocommunity` lines to include `.1` directly and removed the unused `view` directive so the configuration matches the comment.
- The SELinux command `setsebool -P snmpd_exec_user_scripts 1` references a boolean that is not documented as a standard RHEL snmpd SELinux boolean. I replaced it with `audit2allow -w` against recent snmpd AVC denials, which matches Red Hat's documented workflow of reviewing denials and identifying an appropriate boolean, type, or local policy module before applying changes.

## Review Notes
The guide uses SNMPv2c community strings, which are still supported but expose credentials in clear text. For production deployments, a future improvement would be to add an SNMPv3 variant with authentication and privacy settings.
