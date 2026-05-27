# Validation Summary: How to Use Ansible to Configure SNMP on Network Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Cisco IOS network automation
- SNMPv2c
- SNMPv3
- Cisco IOS SNMP configuration
- Ansible Vault
- net-snmp `snmpget`

## Sources Consulted
- Ansible `cisco.ios.ios_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible `cisco.ios.ios_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Ansible `ansible.netcommon.network_cli` connection documentation: https://docs.ansible.com/ansible/latest/collections/ansible/netcommon/network_cli_connection.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Cisco IOS SNMP Support Command Reference, `snmp-server community`, `snmp-server contact`, and related commands: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/command/nm-snmp-cr-book/nm-snmp-cr-s2.html
- Cisco IOS SNMP Configuration Guide, SNMP community and trap host configuration: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/configuration/15-s/snmp-15-s-book/nm-snmp-snmpv1.html
- Cisco IOS XE SNMP Configuration Guide, SNMPv3 user and trap host syntax: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/configuration/xe-3e/snmp-xe-3e-book.pdf
- Cisco IOS SNMP Support Command Reference, `snmp-server enable traps`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/command/nm-snmp-cr-book/nm-snmp-cr-s4.html

## Issues Found
- The SNMPv3 privacy protocol value was shown as `aes128`, which does not match Cisco IOS SNMPv3 user syntax. Cisco IOS expects AES privacy as `aes 128`, `aes 192`, or `aes 256`. Updated the variable value to `"aes 128"` so the rendered command is valid.
- The SNMP ACL task described `deny any log` as an implicit deny. That line is an explicit deny entry. Updated the comment and task name to say explicit deny.
- The audit playbook copied files into `audit/{{ inventory_hostname }}_snmp.txt`, but Ansible's `copy` module does not create the parent directory for a file destination. Added a local `ansible.builtin.file` task to create the `audit` directory before copying audit files.
- The verification section said the playbook used `snmpwalk`, but the command is `snmpget`. Updated the comment to match the command.
- The verification introduction said testing was from the monitoring server, while the playbook delegates the command to `localhost`. Updated the text to say the Ansible control node or monitoring server.

## Review Notes
The examples are Cisco IOS-oriented and rely on the `cisco.ios` collection plus `ansible.netcommon.network_cli`; inventory still needs `ansible_network_os` and credentials configured outside the snippets. Some trap keywords, including environmental and routing protocol traps, are platform and IOS feature dependent, so operators should confirm available `snmp-server enable traps` options with command help on their target devices.
