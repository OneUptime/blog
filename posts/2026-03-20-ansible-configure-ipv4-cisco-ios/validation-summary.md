# Validation Summary: How to Write an Ansible Playbook to Configure IPv4 Addresses on Cisco IOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- Cisco IOS
- Cisco `cisco.ios` Ansible collection
- YAML inventory and playbooks
- IPv4 interface configuration
- Network automation

## Sources Consulted
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible collections listing guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_listing.html
- `ansible-playbook` CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible variables and precedence guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Cisco IOS platform options for Ansible: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- `cisco.ios.ios_l3_interfaces` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_l3_interfaces_module.html
- `cisco.ios.ios_interfaces` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html
- `cisco.ios.ios_command` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- `cisco.ios.ios_config` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Cisco IOS collection source for `ios_command`: https://github.com/ansible-collections/cisco.ios/blob/main/plugins/modules/ios_command.py
- Cisco IOS collection source for `ios_config`: https://github.com/ansible-collections/cisco.ios/blob/main/plugins/modules/ios_config.py

## Issues Found
- The install command used `pip install ansible`, which is less precise than the current official install guidance. It was updated to `python3 -m pip install --user ansible`.
- The inventory used `ansible_connection: network_cli`. It was updated to `ansible.netcommon.network_cli` to match current Ansible platform documentation.
- The post said `host_vars` would automatically supply `interfaces`, but the playbook defined `interfaces` under play `vars`, which has higher precedence than inventory `host_vars`. The playbook was corrected to use `default_interfaces` with `interfaces | default(default_interfaces)` so per-device `host_vars` work as described.
- The verification playbook hardcoded `192.168.10.1` for every host, which conflicted with the per-device `host_vars` example. It was corrected to assert each configured `item.ip_address` from `interfaces` or the inline defaults.
- The description said the example applied to generic switch interfaces. It was clarified to router interfaces and Layer 3 switch interfaces, which matches `cisco.ios.ios_l3_interfaces`.

## Review Notes
- `cisco.ios.ios_command` supports check mode, but in check mode it only executes `show` commands and skips non-`show` commands such as `write memory`; this behavior is consistent with the reviewed example.
