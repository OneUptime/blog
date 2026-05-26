# Validation Summary: How to Use Nested Groups in Ansible Inventory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- INI inventory format
- YAML inventory format
- Ansible nested groups
- Ansible group variables and inventory variable precedence
- Ansible ad hoc commands and inventory patterns
- `ansible-inventory` CLI

## Sources Consulted
- Ansible Community Documentation: How to build your inventory - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Community Documentation: Patterns: targeting hosts and groups - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible Community Documentation: ansible-inventory CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Local execution check with `ansible-core` 2.21.0 installed into `/tmp/ansible-core-review`

## Issues Found
- The sample `ansible-inventory --graph` output omitted the implicit `@ungrouped` group. Current Ansible inventory graphs include `@ungrouped` under `@all`, even when it has no hosts. Added that line to match actual `ansible-inventory --graph` output.

## Review Notes
The inventory syntax, nested group behavior, YAML examples, host targeting patterns, `ansible-inventory --host` usage, and variable precedence explanation are consistent with current Ansible documentation. `ansible_group_priority` must be set in the inventory source rather than in `group_vars`, which is compatible with the post's guidance because it does not show an invalid placement.
