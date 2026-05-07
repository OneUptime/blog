# Validation Summary: How to Use Ansible to Deploy SNMP Configuration Across Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- SNMP
- Cisco IOS
- Linux `net-snmp`
- Junos OS
- Jinja2
- IPv4
- Network automation

## Sources Consulted
- Ansible `ansible-playbook` CLI docs: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible IOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible `cisco.ios.ios_config` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Cisco IOS XE SNMP support guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/configuration/xe-17-x/snmp-xe-17-book/nm-snmp-cfg-snmp-support.html
- Net-SNMP `snmpd.conf` man page: https://www.net-snmp.org/docs/man/snmpd.conf.html
- Debian `snmpd` package page: https://packages.debian.org/bookworm/net/snmpd
- Red Hat net-snmp documentation: https://access.redhat.com/solutions/3505
- Ansible `junipernetworks.junos.junos_config` module docs: https://docs.ansible.com/projects/ansible/latest/collections/junipernetworks/junos/junos_config_module.html
- Juniper Ansible collections overview: https://www.juniper.net/documentation/us/en/software/junos-ansible/ansible/topics/concept/junos-ansible-modules-overview.html
- Juniper `juniper.device.config` docs: https://www.juniper.net/documentation/us/en/software/junos-ansible/ansible/topics/topic-map/junos-ansible-configuration-loading-committing.html
- Juniper connection methods: https://www.juniper.net/documentation/us/en/software/junos-ansible/ansible/topics/topic-map/junos-ansible-connection-methods.html
- Juniper server requirements: https://www.juniper.net/documentation/us/en/software/junos-ansible/ansible/topics/task/junos-ansible-server-installing.html
- Junos SNMP communities: https://www.juniper.net/documentation/us/en/software/junos/network-mgmt/topics/topic-map/snmp-communities.html
- Junos SNMP traps: https://www.juniper.net/documentation/us/en/software/junos/network-mgmt/topics/topic-map/snmp-traps.html
- Junos `version (SNMP)` statement reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/version-edit-snmp.html

## Issues Found
- The description, introduction, and conclusion overstated SNMPv3 coverage across all device types even though only the Cisco IOS section included an SNMPv3 example. I corrected the wording so it now matches the actual examples.
- The Cisco inventory example omitted the connection and platform variables required for `cisco.ios.ios_config`, and it did not show enable-mode settings. I added the documented `ansible_connection`, `ansible_network_os`, and privilege-escalation variables for the Cisco group.
- The Cisco SNMPv3 snippet combined a local SNMPv3 user with a v3 notification host line, but Cisco’s documented SNMPv3 notification workflow uses additional remote-user setup. I removed the partially configured notification host line and kept the verified local SNMPv3 user example.
- The Linux package installation used `net-snmp` unconditionally, which is not the agent package name on Debian-family systems where the package is `snmpd`. I changed the task to select the package name by OS family and added the explicit location and contact variables used by the template.
- The Junos section used `junipernetworks.junos.junos_config`, which is currently deprecated and scheduled for removal. I replaced it with the current `juniper.device.config` module, added the correct execution model (`connection: local`), set `load: set` for `set`-style commands, mapped `host` to `ansible_host`, and set the trap-group version to `v2` because Junos defaults to sending both v1 and v2 traps if the version is omitted.
- The Junos example did not mention that NETCONF must already be enabled. I added that prerequisite.
- The run section only showed `ansible-playbook`, but the post also depends on external collections and Juniper Python libraries. I added the required `ansible-galaxy collection install` and `python3 -m pip install` commands before the playbook run.

## Review Notes
- `snmp-server enable traps` on Cisco and the unqualified Junos trap-group configuration are both technically valid, but they enable broad notification coverage. In production, many teams narrow trap categories to reduce noise.
- The post now accurately reflects that it demonstrates SNMPv3 only on Cisco IOS. If the author wants end-to-end SNMPv3 coverage across Linux and Junos as well, that would require separate `net-snmp` and Junos v3 examples.
- Local CLI verification was not possible in this workspace because `ansible-playbook` and `ansible-galaxy` are not installed, so command validation was performed against the official documentation listed above.
