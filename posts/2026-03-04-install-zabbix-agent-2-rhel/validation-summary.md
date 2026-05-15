# Validation Summary: How to Install Zabbix Agent 2 on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Zabbix Agent 2
- Zabbix 7.0 LTS packages
- Zabbix agent configuration
- TLS pre-shared keys
- firewalld
- SELinux
- systemd

## Sources Consulted
- Zabbix 7.0 Agent 2 configuration parameters: https://www.zabbix.com/documentation/7.0/en/manual/appendix/config/zabbix_agent2
- Zabbix Agent 2 overview and installation notes: https://www.zabbix.com/documentation/7.0/en/manual/concepts/agent2
- Zabbix 7.0 RHEL package repository: https://repo.zabbix.com/zabbix/7.0/rhel/9/x86_64/
- Zabbix 7.0 RHEL package documentation: https://www.zabbix.com/documentation/7.0/en/manual/installation/upgrade/packages/rhel
- Zabbix agent check restriction rules: https://www.zabbix.com/documentation/7.0/en/manual/config/items/restrict_checks
- Zabbix Agent 2 man page: https://www.zabbix.com/documentation/current/en/manpages/zabbix_agent2
- Zabbix 7.0 get documentation: https://www.zabbix.com/documentation/7.0/en/manual/concepts/get
- Zabbix package installation notes for SELinux policy: https://www.zabbix.com/documentation/devel/en/manual/installation/install/packages
- Red Hat Enterprise Linux 9 firewalld documentation: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The `AllowKey=system.run[*]` rule appeared before `DenyKey=system.run[rm *]`. Zabbix evaluates allow/deny rules in order and stops at the first match, so the deny rule would not block matching commands. Moved `DenyKey=system.run[rm *]` before the broad allow rule.
- The local network-interface test used `net.if.in[eth0]`, but RHEL 9 systems commonly use predictable interface names instead of `eth0`. Updated the command to test the default IPv4 route interface dynamically.
- The SELinux section recommended `setsebool -P zabbix_can_network 1`. Current Zabbix package guidance for modern RHEL recommends the `zabbix-selinux-policy` package for supported Zabbix policy rules. Replaced the boolean command with installation of that package while keeping AVC inspection.

## Review Notes
- The Zabbix repository URL used in the post returns HTTP 200 and is present in the official repository listing. Zabbix's RHEL package documentation also documents the `zabbix-release-latest.el9.noarch.rpm` alias, which is another valid option.
- Installing `zabbix-agent2-plugin-*` can install multiple optional loadable plugins. This is technically valid from the repository, but a production guide may prefer installing only required plugin packages.
- If TLS PSK is enabled, `zabbix_get` tests from the server must use matching TLS options or they will fail against an agent that only accepts PSK connections.
