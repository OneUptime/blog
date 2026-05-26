# Validation Summary: How to Create an Ansible Inventory File in YAML Format

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible YAML inventory plugin
- YAML
- Ansible CLI (`ansible`, `ansible-inventory`)
- INI inventory conversion

## Sources Consulted
- Ansible Community Documentation: `ansible.builtin.yaml` inventory plugin, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- Ansible Community Documentation: How to build your inventory, https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Core Documentation: `ansible-inventory` CLI, https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html
- Local verification with `ansible-inventory` from `ansible-core` 2.19.10 installed into `/tmp/ansible-core-review`

## Issues Found
- The post stated that lists are "not possible in INI" and implied that INI inventory values are simply strings requiring Jinja2 filters. Official Ansible documentation is more nuanced: inline INI host variables are interpreted as Python literals, while `:vars` entries are interpreted as strings. Updated the wording to say YAML represents lists directly and avoids INI parsing ambiguity.
- The post stated that a hostname without a trailing colon will always cause a parse error. Official Ansible documentation notes that one machine without a colon can work in a narrow case, but recommends always using a colon. Updated the warning to say missing colons can cause parse errors or unexpected parsing.
- The post claimed there is no performance difference between INI and YAML inventory formats. This was not supported by the consulted official documentation, so the sentence was narrowed to the documented point that both formats are supported.

## Review Notes
All YAML examples in the post were syntactically valid and successfully parsed with `ansible-inventory --list`. The production example was also verified with `ansible-inventory --graph`, `ansible-inventory --host web-east-01.example.com`, and `ansible-inventory --list --yaml`. The CLI flags shown in the post are current in Ansible core 2.19.10.
