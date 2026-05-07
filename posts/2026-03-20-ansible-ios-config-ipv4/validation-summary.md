# Validation Summary: How to Use Ansible ios_config to Push IPv4 Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- `cisco.ios` collection
- `cisco.ios.ios_config` module
- Cisco IOS interface, routing, ACL, and NAT configuration
- `ansible-playbook` CLI

## Sources Consulted
- Ansible Community Documentation: `cisco.ios.ios_config` module - https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible Community Documentation: IOS Platform Options - https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible Community Documentation: `ansible-playbook` CLI reference - https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: Validating tasks with check mode and diff mode - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible Community Documentation: Discovering variables: facts and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible Community Documentation: The `now()` function - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_now.html
- Ansible Community Documentation: Inventory guide for INI variables - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Cisco Command Reference: `ip address` - https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/ip_address.htm
- Cisco Command Reference: `shutdown` / `no shutdown` - https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/shutdown.htm
- Cisco IOS IP Routing Protocol-Independent Command Reference: `ip route` examples - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/Cisco_IOS_IP_Routing_Protocol-Independent_Command_Reference/IP_Routing_Protocol-Independent_Commands_A_through_R.html
- Cisco IOS XE IP Addressing Services Command Reference: NAT commands - https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/17-3/command_reference/b_173_9400_cr/ip_addressing__services_commands.html
- Cisco Command Reference: `ip access-list` - https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/ip_access-list.htm
- Cisco Command Reference: `permit` in named ACL mode - https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/permit.htm

## Issues Found
- The inventory example used legacy short-form network identifiers (`ansible_network_os=ios` and `ansible_connection=network_cli`). I updated them to the current collection-qualified values `cisco.ios.ios` and `ansible.netcommon.network_cli` to match current Ansible network platform documentation.
- The backup example used `ansible_date_time.date` while the play sets `gather_facts: false`. Because `ansible_date_time` is created during fact gathering, that variable would be undefined in this play. I replaced it with `now(fmt='%Y-%m-%d')`, which is supported in templates without enabling fact gathering.
- The backup section described the task as a "before change" backup even though the snippet is presented after configuration tasks. I corrected the heading and wording to describe it accurately as a running-config backup.
- The post described `save_when: modified` as saving only when changes were made. In Ansible, `modified` means the running configuration has changed since the last save to `startup-config`; it is different from `save_when: changed`. I corrected the inline comment and conclusion text.
- The introduction and conclusion described `ios_config` as unconditionally idempotent. The module docs explicitly note that idempotency depends on using full-form commands that match the running configuration, so I qualified that explanation.

## Review Notes
- The example inventory uses plaintext credentials as placeholders. The official IOS platform docs recommend SSH keys or Ansible Vault for real deployments.
