# Validation Summary: How to Set Up SNMPv3 Authentication and Encryption on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Net-SNMP
- SNMPv3
- snmpd configuration
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, "System Monitoring Tools": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-system_monitoring_tools
- Net-SNMP `snmpd.conf` manual page: https://www.net-snmp.org/docs/man/snmpd.conf.html
- Net-SNMP `net-snmp-create-v3-user` packaged manual page: https://manpages.debian.org/unstable/snmpd/net-snmp-create-v3-user.1.en.html
- Net-SNMP SNMPv3 options tutorial: https://www.net-snmp.org/tutorial/tutorial-5/commands/snmpv3.html
- Net-SNMP VACM documentation: https://www.net-snmp.org/wiki/index.php/Vacm
- firewalld rich language manual page: https://firewalld.org/documentation/man-pages/firewalld.richlanguage

## Issues Found
- The `rouser` syntax comment listed `authpriv` as a valid `snmpd.conf` access-control keyword. Net-SNMP VACM documentation uses `priv`, `auth`, and `noauth` for `rouser`/`rwuser`, so the comment was changed to `priv|auth|noauth`.
- The security-level examples used `monitoruser` for `noAuthNoPriv` and `authNoPriv` even though the configured access rule requires `priv`. Notes were added to clarify that those examples require a user and access rule configured for the lower security level.
- The additional-user example appended a new `rwuser adminuser priv -V allview` line after `net-snmp-create-v3-user`, but that helper already adds a `rwuser` line. The example now replaces the automatically added line so the read-write user is restricted to encrypted access and the intended view.

## Review Notes
- The main `authPriv` setup, package installation, `net-snmp-create-v3-user` flags, `snmpget`/`snmpwalk` client options, `systemctl` commands, and firewalld rich rule are technically consistent with the consulted documentation.
- The SHA-256 example is supported by current Net-SNMP 5.9.x tooling, but older RHEL releases with older Net-SNMP builds may only document MD5 and SHA/SHA-1.
