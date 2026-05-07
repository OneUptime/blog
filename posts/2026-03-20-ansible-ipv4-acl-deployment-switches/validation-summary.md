# Validation Summary: How to Automate IPv4 ACL Deployment Across Multiple Switches with Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- Cisco IOS network automation
- IPv4 access control lists (ACLs)
- Ansible inventory, `group_vars`, and Ansible Vault
- `cisco.ios` collection modules (`ios_acls`, `ios_config`)

## Sources Consulted
- Ansible Community Documentation, `cisco.ios.ios_acls` module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_acls_module.html
- Ansible Community Documentation, `cisco.ios.ios_config` module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible Community Documentation, IOS Platform Options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible Community Documentation, `ansible-playbook` CLI: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation, check mode and diff mode: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible Community Documentation, inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- RFC 1918, Address Allocation for Private Internets: https://www.rfc-editor.org/rfc/rfc1918

## Issues Found
- The ACL named `BLOCK_RFC1918_INBOUND` only denied `10.0.0.0/8`, but RFC 1918 defines three private IPv4 ranges. I added denies for `172.16.0.0/12` and `192.168.0.0/16`, then moved the catch-all permit to sequence 40 so the example matches its own stated intent.
- The `cisco.ios.ios_acls` module documents `remarks` as a list of strings. I changed the example from a scalar string to the documented list form.
- The playbook used `state: merged`, but current `ios_acls` documentation notes that IOS cannot update an existing ACE at the same sequence under merge semantics. I changed the task to `state: replaced`, which matches declarative ACL deployment more accurately.
- The verification example only proved that some IPv4 ACL existed on the switch, not that `BLOCK_RFC1918_INBOUND` had been deployed. I updated the assertion to check for the specific ACL name in gathered data.
- The inventory snippet header referenced `/etc/ansible/hosts` while the run commands used `-i hosts`. I changed the comment to `# hosts` so the snippets are internally consistent.
- The inventory example used `network_cli`; I updated it to `ansible.netcommon.network_cli` to match the current platform documentation.

## Review Notes
- The examples assume the `cisco.ios` collection is available. Current Ansible docs note that it is not included in `ansible-core`, though it is commonly present when using the full `ansible` package.
- Depending on device privilege levels, Cisco IOS configuration tasks may also require `ansible_become: true`, `ansible_become_method: enable`, and `ansible_become_password`.
