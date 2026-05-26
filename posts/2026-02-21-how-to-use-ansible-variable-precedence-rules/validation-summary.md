# Validation Summary: How to Use Ansible Variable Precedence Rules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible variable precedence
- Ansible playbooks
- Ansible roles
- Ansible inventory, group_vars, and host_vars
- Ansible CLI commands: ansible-playbook and ansible-inventory
- Ansible modules: debug, include_vars, and set_fact

## Sources Consulted
- Ansible Community Documentation: Using variables and variable precedence: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: ansible-inventory CLI: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible Community Documentation: ansible-playbook CLI: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: ansible.builtin.set_fact module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible Community Documentation: ansible.builtin.debug module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/debug_module.html
- Ansible Community Documentation: ansible.builtin.include_vars module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_vars_module.html

## Issues Found
- The post stated that `set_fact` overrides everything below extra vars and that only extra vars can override a `set_fact` value. Official Ansible precedence places role parameters and include parameters above registered variables and `set_fact`, with extra vars highest. I changed this to say `set_fact` overrides most variables, but role/include parameters and extra vars can still override it.
- The post stated that `-vvv` verbose mode shows where each variable is defined. The official CLI documentation describes `-vvv` as increased verbosity, and the debug module documentation shows `verbosity` controls conditional debug output; Ansible does not generally print a complete variable-origin trace. I changed this to say verbose output can show inventory parsing and included files, which helps narrow down variable sources.
- The precedence list described block vars as "in a block/when task." Official documentation describes block vars as applying to tasks in the block only. I corrected the wording.

## Review Notes
Ansible was not installed in the local workspace, so CLI flags were verified against the current official Ansible documentation rather than local `--help` output. The core precedence table, `ansible-inventory` examples, `--extra-vars` usage, `include_vars` precedence claim, role defaults/vars guidance, and YAML snippets were otherwise consistent with current documentation.
