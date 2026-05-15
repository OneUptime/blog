# Validation Summary: How to Set Up SNMP Trap Receiver on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Net-SNMP `snmptrapd`
- SNMPv2c traps
- systemd
- firewalld
- journalctl

## Sources Consulted
- Net-SNMP `snmptrapd(8)` manual page for daemon purpose, default UDP 162 listener, options, and logging behavior: https://net-snmp.sourceforge.io/docs/man/snmptrapd.html
- Net-SNMP `snmptrapd.conf(5)` manual page for the trap daemon configuration file and `authCommunity` access control: https://netsnmp.org/man/snmptrapd.conf.html
- Net-SNMP snmptrapd wiki for daemon behavior, port 162, and minimal `authCommunity` example: https://net-snmp.sourceforge.io/wiki/index.php/Snmptrapd
- Red Hat Enterprise Linux 9 firewall documentation for opening ports with firewalld and the runtime/permanent configuration distinction: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- Fedora package metadata for `net-snmp`, which identifies the package as containing the `snmpd` and `snmptrapd` daemons: https://packages.fedoraproject.org/pkgs/net-snmp/net-snmp/

## Issues Found
- The post was a placeholder despite describing a concrete RHEL SNMP trap receiver setup. Added the missing installation step using the RHEL/CentOS package names `net-snmp` and `net-snmp-utils`.
- Replaced the invalid placeholder path `/etc/<service>/config.conf` with the Net-SNMP trap daemon configuration path `/etc/snmp/snmptrapd.conf`.
- Added a minimal valid `authCommunity log,execute,net trapCommunity123` example because Net-SNMP `snmptrapd` requires access control rules for processing received traps.
- Replaced all `<service-name>` placeholders with the actual systemd service name, `snmptrapd`.
- Added firewalld commands for UDP port 162, the standard SNMP trap listener port used by `snmptrapd`.
- Replaced generic verification with a valid local SNMPv2c `snmptrap` command and `journalctl -u snmptrapd` log checks.
- Replaced the placeholder package troubleshooting command with `rpm -q net-snmp net-snmp-utils`.

## Review Notes
- The corrected guide uses SNMPv2c for a minimal working receiver. For production environments, SNMPv3 authentication and privacy should be preferred where supported by the sending devices.
- The community string `trapCommunity123` is an example and should be changed before production use.
