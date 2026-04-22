# Validation Summary: How to Configure SNMP Traps over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SNMP traps and informs
- IPv6 transport addressing
- Net-SNMP `snmpd`, `snmptrapd`, `snmptrap`, and `snmpinform`
- Linux `ip6tables`
- Cisco IOS / IOS XE SNMP notification configuration
- Juniper Junos SNMP trap groups
- Bash trap handler scripts

## Sources Consulted
- Net-SNMP `snmpd.conf(5)` manual page for `trapsink`, `trap2sink`, `informsink`, `trapsess`, `authtrapenable`, and `linkUpDownNotifications`: https://net-snmp.sourceforge.io/docs/man/snmpd.conf.html
- Net-SNMP `snmpcmd(1)` manual page for IPv6 `udp6` transport target syntax: https://net-snmp.sourceforge.io/docs/man/snmpcmd.html
- Net-SNMP `snmptrap(1)` manual page for SNMPv2c/SNMPv3 trap and inform command syntax: https://net-snmp.sourceforge.io/docs/man/snmptrap.html
- Net-SNMP `snmptrapd.conf(5)` manual page for `authCommunity`, `createUser`, `authUser`, `logOption`, and `traphandle` stdin format: https://net-snmp.sourceforge.io/docs/man/snmptrapd.conf.html
- Net-SNMP SNMPv3 traps versus informs tutorial for SNMPv3 engine ID and `createUser` behavior: https://net-snmp.sourceforge.io/tutorial/tutorial-5/commands/snmptrap-v3.html
- Net-SNMP `snmptrapd(8)` manual page for listening address behavior: https://net-snmp.sourceforge.io/docs/man/snmptrapd.html
- RFC 3849 for the IPv6 documentation prefix `2001:db8::/32`: https://www.rfc-editor.org/info/rfc3849
- RFC 4291 for IPv6 text representation rules: https://www.rfc-editor.org/rfc/rfc4291
- Cisco IOS XE SNMP over IPv6 documentation for `snmp-server host` syntax and IPv6 SNMP notifications: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ntw-servs/b-network-services/m_ip6-snmp.html
- Juniper Junos SNMP traps documentation for trap group targets, `version v2`, and `categories link`: https://www.juniper.net/documentation/us/en/software/junos/network-mgmt/topics/topic-map/snmp-traps.html

## Issues Found

1. **Invalid IPv6 placeholders**: The post used addresses such as `2001:db8::nms`, `2001:db8::nms1`, and `2001:db8::nms2`. These are not valid IPv6 literals because IPv6 address fields are hexadecimal. Replaced them with valid documentation-prefix addresses such as `2001:db8::10`, `2001:db8::11`, and `2001:db8::12`.

2. **Wrong Net-SNMP sink directive for SNMPv2c traps**: The post described sending SNMPv2c traps but used `trapsink`, which Net-SNMP documents as sending SNMPv1 traps. Changed the example to use `trap2sink` for SNMPv2c traps.

3. **Incorrect SNMPv3 inform configuration in `snmpd.conf`**: The post used `informsink` with SNMPv3 command-line flags. Net-SNMP documents `informsink` for SNMPv2 informs and `trapsess` as the appropriate directive for SNMPv3 notification receivers. Replaced the example with `trapsess -Ci -v 3 ... udp6:[2001:db8::10]:162`.

4. **Incorrect SNMPv3 inform receiver user setup**: The receiver example used `createUser -e ...`, which is the sender-engine-ID pattern needed for SNMPv3 traps. The article's SNMPv3 example sends informs, where the receiver's user is created without a sender engine ID. Removed `-e 0x8000000001020304` and updated the comment to "SNMPv3 inform user."

5. **Incomplete test trap varbind OIDs**: The SNMPv2c `snmptrap` example used `ifIndex`, `ifAdminStatus`, and `ifOperStatus` without instance suffixes. Varbinds should identify object instances, so these were changed to numeric IF-MIB instance OIDs ending in `.1`.

6. **Incorrect `traphandle` input assumptions**: The handler script claimed that `snmptrapd` passes trap details through environment variables such as `SNMPTRAPD_NOTIFY_CATEGORY` and `SNMPTRAPD_NOTIFY_OID`. Net-SNMP documents `traphandle` input as stdin lines containing hostname, IP address, and varbinds. Rewrote the script to read from stdin.

7. **Shell redirection with `sudo` would not reliably save firewall rules**: `sudo ip6tables-save > /etc/ip6tables/rules.v6` runs the redirection as the current shell user, which can fail on a root-owned path. Changed it to `sudo sh -c 'ip6tables-save > /etc/ip6tables/rules.v6'`.

8. **Misleading service configuration comment**: The post called `/etc/default/snmptrapd` a systemd override. That file is a Debian/Ubuntu service defaults file, not a systemd override. Updated the comment accordingly.

9. **Overbroad IPv6 configuration wording**: The intro and final paragraph implied the receiver has a trap destination address rather than an IPv6 listening binding. Updated the wording to distinguish agent destination configuration from `snmptrapd` IPv6 binding.

## Review Notes
- The corrected Net-SNMP `udp6:[2001:db8::10]:162` target format and `udp6:162` listening format match Net-SNMP transport syntax.
- The Cisco IOS / IOS XE and Juniper Junos snippets are syntactically consistent with vendor documentation after replacing the invalid IPv6 placeholder.
- `ip6tables` is still usable, but many current Linux distributions prefer nftables or firewalld for persistent firewall management.
- Net-SNMP SNMPv3 user placement can vary by distribution; persistent user entries are often stored under `/var/lib/net-snmp` or `/var/net-snmp`.
