# Validation Summary: How to Use Ansible ios_acls Module to Deploy IPv4 Access Control Lists

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Cisco IOS / IOS XE
- IPv4 access control lists (ACLs)
- `cisco.ios` Ansible collection
- `cisco.ios.ios_acls`
- `cisco.ios.ios_acl_interfaces`
- `cisco.ios.ios_command`

## Sources Consulted
- Ansible `cisco.ios.ios_acls` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_acls_module.html
- Ansible `cisco.ios.ios_acl_interfaces` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_acl_interfaces_module.html
- Ansible `cisco.ios.ios_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Ansible IOS Platform Options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible collections installation guide: https://docs.ansible.com/ansible/latest/collections_guide/collections_installing.html
- Ansible `ansible-galaxy` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html

## Issues Found
- The original ACL examples used `host` with CIDR notation such as `10.0.0.0/8` and `172.16.0.0/12`. In the documented `ios_acls` schema, `host` is for a single host, while network matches use `address` plus `wildcard_bits`. I corrected both ACEs to the documented format.
- The original ACE definitions used `remark` as a scalar field. The module documentation defines `remarks` as a list of strings. I replaced the invalid field with `remarks`.
- The original interface-attachment example used `cisco.ios.ios_interfaces` and then `cisco.ios.ios_command` to enter configuration mode and run `ip access-group`. The `ios_interfaces` resource module does not manage ACL bindings, and the `ios_command` documentation explicitly says it does not support configuration mode. I replaced that section with `cisco.ios.ios_acl_interfaces`.
- The original Step 4 said `state: deleted` could remove a specific ACE by sequence number. The official `ios_acls` documentation states that `deleted` removes ACLs, while `replaced` rewrites the ACE list for the specified ACL. I rewrote the example to remove sequence 10 by replacing the ACL with the remaining ACEs.
- The original post described `state: deleted` as a way to remove specific ACEs and described `state: replaced` as replacing "the entire ACL" without clarifying scope. I corrected the conclusion and inline comment so they match the documented behavior.
- The numeric destination ports in `port_protocol.eq` were written as bare numbers. The documented argspec treats these values as strings, so I quoted the numeric ports for schema consistency.

## Review Notes
- The examples assume the inventory or group variables already define `ansible_connection: ansible.netcommon.network_cli`, `ansible_network_os: cisco.ios.ios`, and any needed enable-mode settings. The post references an inventory file but does not show those variables.
- The current official docs reviewed were for `cisco.ios` collection version 11.3.0 and note testing against Cisco IOS XE 17.3 on CML.
- Ansible CLI binaries were not installed in the review environment, so command syntax was validated against official Ansible documentation rather than local `--help` output.
