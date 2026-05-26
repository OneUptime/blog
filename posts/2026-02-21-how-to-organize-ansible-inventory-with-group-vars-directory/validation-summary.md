# Validation Summary: How to Organize Ansible Inventory with group_vars Directory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible `group_vars`
- Ansible Vault
- YAML inventory variable files
- Ansible CLI commands (`ansible-playbook`, `ansible-inventory`, `ansible-vault`)

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `host_group_vars` vars plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_group_vars_vars.html
- Ansible `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible-vault` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible variables guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html

## Issues Found
- Clarified that playbook-adjacent `group_vars` are loaded when using `ansible-playbook`; non-playbook commands need `--playbook-dir` to use a playbook-relative directory.
- Corrected the custom path explanation. Ansible does not provide a generic `group_vars` path setting in the shown config; setting `inventory` controls the inventory source and therefore the inventory-adjacent `group_vars` location.
- Clarified that group variable directories load valid variable files in lexicographical order, with `.yml`, `.yaml`, `.json`, or no extension.
- Clarified nested group precedence to include same-level parent group merge behavior.
- Reworded the YAML syntax error note to avoid implying malformed YAML is silently ignored.

## Review Notes
Ansible is not installed in the local workspace, so CLI checks were verified against current official Ansible documentation rather than local `--help` output. The examples are otherwise consistent with documented inventory, Vault, and CLI behavior.
