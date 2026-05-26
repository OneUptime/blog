# Validation Summary: How to Define Group Variables in Ansible Inventory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible group variables and host variables
- INI inventory format
- YAML inventory format
- Ansible Vault
- Ansible playbooks and Jinja2 templates

## Sources Consulted
- Ansible Community Documentation: How to build your inventory - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Community Documentation: ansible-vault CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible Documentation: host_group_vars vars plugin - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/host_group_vars_vars.html

## Issues Found
- The `ansible_group_priority` example showed the variable being set in `group_vars/alpha_group.yml` and `group_vars/beta_group.yml`. Official Ansible documentation states that `ansible_group_priority` can only be set in an inventory source, not in `group_vars/`, because it is used while loading `group_vars/`. I changed the example to set `ansible_group_priority` under each group's `vars` block in `inventory.yml`.

## Review Notes
Ansible was not installed in the local environment, so CLI examples could not be executed locally. The syntax and behavior were checked against current official Ansible documentation instead.
