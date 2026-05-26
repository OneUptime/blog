# Validation Summary: How to Use Multiple Inventory Files in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible inventory directories
- Static INI and YAML inventory files
- Dynamic inventory plugins
- ansible.cfg configuration
- ansible-playbook and ansible-inventory CLI commands

## Sources Consulted
- Ansible Community Documentation: How to build your inventory - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Community Documentation: Ansible Configuration Settings - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Core Documentation: ansible-inventory CLI - https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html

## Issues Found
- The post said Ansible loads "every file" in an inventory directory. Official documentation says Ansible aggregates inventory sources from a directory while ignoring configured directories and extensions. Updated the wording to "eligible inventory sources" in the directory inventory and default inventory sections.
- The `ignore_extensions` section described the setting as configuring additional exclusions, but this configuration value sets the ignored extension list. Updated the explanation and example so the configured list includes the default ignored extensions the reader still wants to keep, plus the added extensions.

## Review Notes
The remaining examples and claims align with Ansible's documented behavior: multiple `-i` sources are supported, directory inventory sources are merged in filename order, later variable definitions can win according to inventory merge order and precedence rules, inventory can mix static files with dynamic inventory plugin sources, and the shown `ansible-inventory` commands use documented options.
