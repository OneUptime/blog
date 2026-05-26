# Validation Summary: How to Use the advanced_host_list Inventory Plugin in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible inventory plugins
- ansible and ansible-playbook CLI commands
- ansible.cfg inventory plugin configuration
- Bash scripting
- YAML playbooks

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.advanced_host_list inventory plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/advanced_host_list_inventory.html
- Ansible Community Documentation: ansible.builtin.host_list inventory plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_list_inventory.html
- Ansible Core Documentation: Inventory plugins and enable_plugins behavior: https://docs.ansible.com/projects/ansible-core/devel/plugins/inventory.html
- Ansible upstream source: advanced_host_list inventory plugin: https://github.com/ansible/ansible/blob/devel/lib/ansible/plugins/inventory/advanced_host_list.py
- Ansible upstream source: host_list inventory plugin: https://github.com/ansible/ansible/blob/devel/lib/ansible/plugins/inventory/host_list.py
- Ansible upstream source: INVENTORY_ENABLED default configuration: https://github.com/ansible/ansible/blob/devel/lib/ansible/config/base.yml

## Issues Found
- The `enable_plugins` example did not preserve Ansible's full default inventory plugin list. Official documentation states that setting `enable_plugins` overrides the default list, so the original example would have disabled `script`, `auto`, and `toml`. Updated the snippet to include `advanced_host_list` before the default plugins and added a sentence explaining that the setting replaces the default list.

## Review Notes
- The Ansible CLI was not installed in the local environment, so commands could not be executed directly. The examples and claims were validated against current official documentation and upstream Ansible source.
