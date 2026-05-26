# Validation Summary: How to Use Ansible cli_config Module for Network Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.netcommon collection
- ansible.netcommon.cli_config module
- ansible.netcommon.cli_command module
- ansible.netcommon.network_cli connection plugin
- Jinja2 templates
- Cisco IOS, Cisco NX-OS, Arista EOS, Junos OS, and VyOS network configuration

## Sources Consulted
- Ansible ansible.netcommon.cli_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/cli_config_module.html
- Ansible ansible.netcommon.cli_command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/cli_command_module.html
- Ansible ansible.netcommon.network_cli connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/network_cli_connection.html
- Ansible network platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_index.html
- Ansible ansible.netcommon cli_config source: https://github.com/ansible-collections/ansible.netcommon/blob/main/plugins/modules/cli_config.py
- Juniper Junos syslog configuration reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/syslog-edit-system.html
- Juniper Junos syslog host reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/host-edit-system.html
- Arista EOS banner and management SSH command references: https://www.arista.com/en/um-eos/eos-switch-administration-commands and https://www.arista.com/en/um-eos/eos-session-management-commands
- Cisco NX-OS SSH and VTY command references: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus9000/sw/7-x/security/configuration/guide/b_Cisco_Nexus_9000_Series_NX-OS_Security_Configuration_Guide_7x/b_Cisco_Nexus_9000_Series_NX-OS_Security_Configuration_Guide_7x_chapter_0111.html and https://www.cisco.com/c/en/us/td/docs/switches/datacenter/sw/nx-os/fundamentals/configuration/guide/b_Cisco_Nexus_7000_Series_NX-OS_Fundamentals_Configuration_Guide/m_configuring_terminal_settings_and_sessions.html
- VyOS syslog documentation: https://docs.vyos.io/en/1.4/configuration/system/syslog.html and https://docs.vyos.io/en/latest/configuration/system/syslog.html

## Issues Found
- The Junos syslog example used `set system syslog time-override`, which is not a documented Junos syslog statement. I changed it to `set system syslog time-format year`, which matches Junos syslog syntax.
- The commit section described an "Apply configuration with commit confirmed" task, but `ansible.netcommon.cli_config` does not provide a commit-confirmed parameter. I removed that example and scoped the section to supported commit comments.
- The tips section said not to mix `cli_config` and `cli_command`, even though using both in the same playbook is valid when they are used for different command contexts. I changed the guidance to say to use `cli_config` for configuration commands and `cli_command` for exec/operational commands.

## Review Notes
- The examples assume inventory already sets `ansible_connection: ansible.netcommon.network_cli` and the appropriate `ansible_network_os` value for each device.
- VyOS syslog syntax varies by release: VyOS 1.4 LTS documents `set system syslog host`, while current rolling-release documentation uses `set system syslog remote`. The post does not pin a VyOS release, so this is worth noting if the article is expanded later.
