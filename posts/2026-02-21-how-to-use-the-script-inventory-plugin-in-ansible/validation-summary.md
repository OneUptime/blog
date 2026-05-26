# Validation Summary: How to Use the Script Inventory Plugin in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory plugins
- ansible.builtin.script inventory plugin
- Dynamic inventory scripts
- Python
- Bash
- JSON
- jq
- curl

## Sources Consulted
- Ansible Core documentation: ansible.builtin.script inventory plugin, https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/script_inventory.html
- Ansible Core documentation: Developing dynamic inventory, inventory script conventions, https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_inventory.html
- Ansible Core documentation: Inventory plugins, https://docs.ansible.com/projects/ansible-core/devel/plugins/inventory.html
- Ansible Community documentation: Building inventory and organizing inventory in a directory, https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible CLI documentation: ansible-inventory, https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html

## Issues Found
- The post said `--host <hostname>` was optional. Ansible's inventory script conventions require scripts to accept both `--list` and `--host <hostname>`, although Ansible will not call `--host` for each host when `_meta.hostvars` is present. Updated the wording to say `--host` must be supported and may return an empty JSON object.
- The post showed a YAML plugin configuration file using `plugin: ansible.builtin.script` and `path: /path/to/my_inventory.py`. The script plugin inventory source is the executable script itself, and the documented plugin options do not include a `path` field. Replaced that section with the correct inventory-directory approach: place the executable script alongside other inventory sources and point Ansible at the directory.

## Review Notes
Ansible is not installed in this workspace, so CLI behavior could not be tested locally with `ansible` or `ansible-inventory`. The commands and plugin behavior were verified against current official Ansible documentation instead.
