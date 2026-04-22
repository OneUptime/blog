# Validation Summary: How to Configure SNMPv3 over IPv6

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- SNMPv3
- IPv6 transport for SNMP
- Net-SNMP / snmpd on Linux
- Cisco IOS / IOS XE SNMPv3 configuration
- Juniper Junos OS SNMPv3 configuration
- tcpdump and Linux systemd logging

## Sources Consulted
- Net-SNMP `snmpd.conf(5)` manual: https://www.net-snmp.org/docs/man/snmpd.conf.html
- Net-SNMP `snmpd(8)` manual: https://www.net-snmp.org/docs/man/snmpd.html
- Net-SNMP `snmp.conf(5)` manual: https://www.net-snmp.org/docs/man/snmp.conf.html
- Net-SNMP `snmpcmd(1)` manual: https://www.net-snmp.org/docs/man/snmpcmd.html
- Net-SNMP IPv6 command-line FAQ: https://www.net-snmp.org/wiki/index.php/FAQ:Applications_28
- Net-SNMP SNMPv3 setup notes: https://www.net-snmp.org/docs/README.snmpv3.html
- RFC 3411, SNMP architecture and security levels: https://datatracker.ietf.org/doc/html/rfc3411
- RFC 3414, User-based Security Model for SNMPv3: https://www.rfc-editor.org/rfc/rfc3414
- RFC 3826, AES Cipher Algorithm in SNMP USM: https://www.rfc-editor.org/rfc/rfc3826
- Cisco IOS XE 17 SNMPv3 AES / 3-DES configuration guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/configuration/xe-17-x/snmp-xe-17-book/nm-snmp-encrypt-snmp-support.html
- Cisco IOS XE 17 SNMP group/user/host command syntax: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/configuration/xe-17-x/snmp-xe-17-book/nm-snmp-vpn-context.html
- Juniper Junos OS SNMPv3 configuration guide: https://www.juniper.net/documentation/us/en/software/junos/network-mgmt/topics/topic-map/configure-snmpv3.html
- Juniper Junos OS SNMP group access privileges / VACM guide: https://www.juniper.net/documentation/us/en/software/junos/network-mgmt/topics/topic-map/access-privileges-for-an-snmp-group.html
- Juniper Junos OS SNMPv3 traps guide: https://www.juniper.net/documentation/us/en/software/junos/network-mgmt/topics/topic-map/snmpv3-traps.html

## Issues Found
- The heading called the SNMPv3 security levels "security models." Changed it to "SNMPv3 Security Levels" to match RFC terminology.
- The Linux snippet used shell redirection to append to `/etc/snmp/snmpd.conf` without elevated privileges. Changed it to `sudo tee -a`.
- The `net-snmp-create-v3-user -ro` flow could create a `rouser` access line that does not require privacy, and adding another `rouser` for the same user conflicts with Net-SNMP guidance. Changed the snippet to update the generated access line to `priv` instead of adding a duplicate.
- The persistent Net-SNMP user file path was shown as only `/var/lib/snmp/snmpd.conf`. Updated the verification command to handle common `/var/net-snmp/snmpd.conf`, `/var/lib/net-snmp/snmpd.conf`, and `/var/lib/snmp/snmpd.conf` locations.
- The complete Net-SNMP config referenced users without corresponding `createUser` comments. Added matching commented user-definition examples.
- The `rouser ipv6readonly priv systemonly` example used invalid named-view syntax. Changed it to `rouser ipv6readonly priv -V systemonly`.
- The `rouser ipv6monitor priv 1.3.6.1` comment claimed full-tree access while the OID constrained access. Removed the OID to match full OID tree access.
- The SNMP client examples used invalid placeholder IPv6 literals such as `2001:db8::server` and did not quote bracketed IPv6 transport strings. Replaced them with documentation-prefix numeric IPv6 addresses and quoted the transport string.
- The `~/.snmp/snmp.conf` example did not create the directory or protect credential file permissions. Added `mkdir`, `chmod 700`, and `chmod 600` commands.
- Cisco and Junos snippets used shell-style backslash continuations in device CLI examples. Converted those commands to single-line device commands.
- The Junos example configured a VACM access group but did not map the SNMPv3 user to that group or define the referenced `all` view. Added the required `security-to-group` and `view` statements.
- The Junos trap example used `trap-group version v3`, which is not the SNMPv3 target-parameters workflow documented by Juniper. Replaced it with `notify`, `target-address`, and `target-parameters` SNMPv3 trap configuration.
- The monitoring section referenced `log_in_msg`, which is not a Net-SNMP `snmpd.conf` directive. Replaced it with the documented `snmpd -a` source-address logging option.
- The final paragraph claimed IPv6 provides "improved routing." Reworded it to "native IPv6 transport" to avoid an overbroad technical claim.

## Review Notes
The examples are intentionally generic. Exact Net-SNMP state directories and Cisco/Junos feature support can vary by distribution, platform, and release, so production deployments should still check the local man pages and vendor release notes for the target device or OS image.
