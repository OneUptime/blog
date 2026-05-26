# Validation Summary: How to Debug Ansible Variable Undefined Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible variables and variable precedence
- Ansible inventory, `group_vars`, and `host_vars`
- Ansible facts and magic variables
- Ansible modules: `ansible.builtin.debug`, `ansible.builtin.include_vars`, `ansible.builtin.uri`, `ansible.builtin.copy`, `ansible.builtin.assert`
- Jinja2/Ansible filters and tests: `default`, `dict2items`, `selectattr`, `defined`, `succeeded`

## Sources Consulted
- Ansible documentation: Using variables and variable precedence, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible documentation: Handling undefined variables with filters, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible documentation: Conditionals and registered variables, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible documentation: Facts and magic variables, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible documentation: `ansible.builtin.include_vars`, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible documentation: `ansible.builtin.first_found` lookup, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/first_found_lookup.html
- Ansible documentation: `ansible-inventory` CLI, https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html

## Issues Found
- The variable precedence list was incomplete and had `vars_files` before `vars_prompt`. Updated the list to match Ansible's documented order more closely, including `group_vars/all`, host vars, role vars, block vars, include params, and extra vars.
- The cross-host example said `db_primary_ip` was defined on database hosts but the fix used `ansible_default_ipv4.address` instead. Updated the fix to read `db_primary_ip` from the selected database host's `hostvars`.
- The skipped registered task example said a skipped task is not registered. Ansible documents that skipped tasks still register a result for each host unless skipped by tags. Updated the text to explain that the skipped result lacks `json.version`.
- The nested `default` example warned that `config.server.name | default(...)` fails if `config` is undefined. Ansible 2.8 and later allow defaulting through undefined intermediate attributes. Updated the note and kept the dictionary-method alternative as another valid pattern.

## Review Notes
The local environment did not have Ansible installed, so CLI behavior was verified against official Ansible documentation rather than local `--help` output. The `grep` command is functional but `rg` would be faster in large repositories; this is an improvement opportunity, not a correctness issue.
