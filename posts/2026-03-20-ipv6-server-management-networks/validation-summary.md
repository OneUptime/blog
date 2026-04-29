# Validation Summary: How to Configure IPv6 for Server Management Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnetting
- Linux network configuration
- Netplan
- NetworkManager / `nmcli`
- OpenSSH
- `ip6tables`
- Net-SNMP
- Ansible inventory and playbooks
- BIND / DNS AAAA and reverse DNS

## Sources Consulted
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/html/rfc3596
- Netplan YAML configuration reference: https://canonical-netplan.readthedocs-hosted.com/en/0.105/netplan-yaml.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/OpenBSD-6.6/sshd_config.5
- NetworkManager settings reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Red Hat `nmcli` gateway configuration docs: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/managing-the-default-gateway-setting_configuring-and-managing-networking
- Net-SNMP `snmpd.conf` manual: https://net-snmp.sourceforge.io/docs/man/snmpd.conf.html
- Net-SNMP `snmpd.examples` manual: https://net-snmp.sourceforge.io/docs/man/snmpd.examples.html
- Net-SNMP `snmpcmd` manual: https://net-snmp.sourceforge.io/docs/man/snmpcmd.html
- Ansible INI inventory plugin docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ini_inventory.html
- Ansible inventory getting-started docs: https://docs.ansible.com/ansible/latest/getting_started/get_started_inventory.html
- Local `iptables-extensions(8)` man page for `state` / `conntrack` match behavior

## Issues Found
- The post used invalid IPv6 example addresses such as `2001:db8:mgmt::/48`. IPv6 hextets are hexadecimal only, so `mgmt` is not a valid address segment. I replaced the examples with valid RFC 3849 documentation addresses under `2001:db8:1000::/48`.
- The Netplan example omitted `version: 2` and used deprecated `gateway6`. I added `version: 2` and replaced `gateway6` with a documented `routes` default route.
- The RHEL/CentOS example used legacy `ifcfg-*` network-scripts without version scoping. I replaced it with a current NetworkManager `nmcli` example.
- The SSH restriction example only allowed logins from the IPv6 management prefix even though the snippet also configured an IPv4 listener. I updated `AllowUsers` to allow both the IPv4 and IPv6 management subnets, and made the restart command portable across Debian/Ubuntu and RHEL-style service names.
- The SNMP example had multiple issues: `agentAddress udp:[0.0.0.0]:161` used the wrong address format, `trap6sink` was the wrong mechanism for SNMPv3 notifications, and `createUser` belongs in `/var/net-snmp/snmpd.conf` rather than the main config file. I corrected all three.
- The Ansible inventory block was labeled as YAML even though it was INI, and `ansible_ssh_extra_args='-6'` in `[all:vars]` would be interpreted as a literal quoted string. I changed the fence to INI, quoted the IPv6 host literals on host lines, and removed the quotes from the group var.
- The DNS examples still contained invalid AAAA data and an incorrect IPv6 reverse-DNS example. I corrected the AAAA records and replaced the reverse example with a valid `ip6.arpa` zone and PTR name format.

## Review Notes
- The post now uses RFC 3849 documentation prefixes, which are correct for published examples but must not be used on live networks.
- The `ip6tables-save > /etc/ip6tables/rules.v6` persistence path is distro-specific. The command is valid, but other distributions may persist firewall rules differently.
