# Validation Summary: How to Configure SNMP Agents for IPv6 Transport

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- SNMP and SNMPv2c/SNMPv3
- IPv6 transport
- Net-SNMP snmpd
- Linux package management and systemd
- ip6tables firewall rules
- Cisco IOS SNMP configuration
- Junos OS SNMP configuration

## Sources Consulted
- Net-SNMP snmpd.conf(5): https://netsnmp.org/man/snmpd.conf.html
- Net-SNMP snmpd(8) listening address syntax and debug options: https://netsnmp.org/man/snmpd.html
- Net-SNMP snmpcmd(1) agent/transport syntax: https://netsnmp.org/man/snmpcmd.html
- Ubuntu net-snmp-create-v3-user(1), Net-SNMP 5.9.4 package: https://manpages.ubuntu.com/manpages/noble/man1/net-snmp-create-v3-user.1.html
- Debian Net-SNMP 5.9.4 net-snmp-create-v3-user source: https://sources.debian.org/src/net-snmp/5.9.4%2Bdfsg-2/net-snmp-create-v3-user.in/
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- Cisco IOS XE SNMP over IPv6 configuration guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_nman/configuration/xe-16/ip6n-xe-16-book/ip6-snmp.html
- Juniper Junos OS SNMP traps documentation: https://www.juniper.net/documentation/us/en/software/junos/network-mgmt/topics/topic-map/snmp-traps.html
- Juniper Junos OS SNMP communities documentation: https://www.juniper.net/documentation/us/en/software/junos/network-mgmt/topics/topic-map/snmp-communities.html
- Local command help for ip6tables and ss.

## Issues Found
- Several examples used placeholder words inside IPv6 literals, such as `2001:db8::nms`, `2001:db8:monitoring::/48`, and `udp6:[2001:db8::target]:161`. These are not valid IPv6 addresses, so I replaced them with valid RFC 3849 documentation-prefix examples: `2001:db8::10`, `2001:db8::20`, and `2001:db8:100::/48`.
- The comment `Walk all OIDs over IPv6` preceded a command that only walks the `system` subtree. I changed it to `Walk the system group over IPv6`.
- The `ip6tables-save` example used a path that is not the usual iptables-persistent IPv6 rules file on Debian/Ubuntu and used `sudo` with shell redirection in a way that would not elevate the write. I changed it to `sudo sh -c 'ip6tables-save > /etc/iptables/rules.v6'`.
- The Cisco IOS comment said `Enable IPv6 SNMP` above `snmp-server enable traps`, but that command enables SNMP traps rather than IPv6 SNMP generally. I changed the comment to `Enable SNMP traps`.
- The `log_in_msg 5` example is not a documented Net-SNMP `snmpd.conf` directive. I replaced it with documented `snmpd` debug flags: `-f` foreground mode, `-Lo` stdout logging, `-a` source-address logging, and `-d` packet dumps.

## Review Notes
The Net-SNMP `agentAddress udp6:161`, dual `udp:161,udp6:161`, `rocommunity6`, SNMPv3 polling options, and `udp6:[address]:port` client syntax are consistent with the consulted Net-SNMP documentation. The Cisco and Junos snippets remain intentionally minimal and should be adapted with access lists, trap categories, and platform-specific security policy in production.
