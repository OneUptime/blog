# Validation Summary: How to Set Default Groups for All Hosts in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible INI inventory plugin
- Ansible YAML inventory plugin
- Ansible constructed inventory plugin
- Ansible group variables
- Ansible add_host module
- ansible-playbook and ansible-inventory CLI usage

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- ansible.builtin.ini inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ini_inventory.html
- ansible.builtin.yaml inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- ansible.builtin.constructed inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/constructed_inventory.html
- ansible.builtin.add_host module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/add_host_module.html

## Issues Found
- The `add_host` example attempted to add each host with `name: "{{ inventory_hostname }}"` in a task that would not execute per host in the way ordinary modules do. The current `ansible.builtin.add_host` documentation describes it as a global action and shows using a loop over `ansible_play_hosts` when adding all hosts running a playbook. I changed the example to use `name: "{{ item }}"` with `loop: "{{ ansible_play_hosts }}"`.

## Review Notes
- The inventory examples using `all`, `ungrouped`, INI `:children`, YAML `children`, `group_vars`, constructed `groups`, and constructed `keyed_groups` match the current Ansible documentation.
- The constructed inventory examples correctly pass the static inventory before the constructed inventory source, which matters because the constructed plugin can use variables already available from previous inventories or the fact cache.
