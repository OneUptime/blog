# Validation Summary: How to Use Ansible Inventory with IPv6 Addresses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible SSH connection variables
- INI inventory format
- YAML inventory format
- IPv6 addressing
- OpenSSH client configuration
- Python YAML generation

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible INI inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ini_inventory.html
- Ansible YAML inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible CLI documentation for `ansible` and `ansible-inventory`: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html and https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- RFC 4007, IPv6 Scoped Address Architecture: https://www.rfc-editor.org/rfc/rfc4007.html
- RFC 6874, IPv6 Zone Identifiers in URIs: https://www.rfc-editor.org/rfc/rfc6874
- Local smoke tests with ansible-core 2.21.0 installed into a temporary target directory.

## Issues Found
- The post incorrectly said INI inventory IPv6 values in `ansible_host` must use square brackets. I changed the examples to use unbracketed IPv6 literals because Ansible passes bracketed `ansible_host` values through to SSH as literal bracketed hostnames.
- The post showed bracketed IPv6 literals as standalone INI inventory hostnames. I changed those examples to unbracketed literals; ansible-core 2.21 rejects `[2001:db8:1::10]` as an invalid section entry.
- The dual-stack section said a group-level `ansible_host` override could switch hosts to IPv4 even when host-level `ansible_host` values were present. I changed the example to set `ansible_host` from a per-host `ipv4_address`, matching Ansible inventory variable precedence.
- The link-local INI example used `%25` URI encoding. I changed it to a literal `%` and clarified that `%25` applies to URI syntax, not the hostname Ansible passes to SSH.
- The SSH `AddressFamily any` description said it prefers IPv6 and falls back to IPv4. I changed it to say it allows either address family, matching the OpenSSH documentation.
- The `group_vars` NTP examples used invalid IPv6 addresses containing `ntp` as a hextet. I changed them to valid documentation-prefix IPv6 literals.
- The testing section used `ping6`; I changed it to `ping -6`, which is the current common iputils form while preserving the intended check.

## Review Notes
Brackets are still correct in the ProxyJump example because OpenSSH documents bracketed IPv6 literals for `-J`/ProxyJump-style host-and-port parsing. The examples were smoke-tested with ansible-core 2.21.0 for inventory parsing and connection command construction; actual SSH connectivity was not expected because the documentation-prefix and private addresses are examples.
