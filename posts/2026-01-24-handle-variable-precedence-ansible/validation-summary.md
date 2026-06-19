# Validation Summary: How to Handle Variable Precedence in Ansible

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible variable precedence
- Ansible roles
- Ansible inventory variables
- Ansible facts, registered variables, and `set_fact`
- Ansible `include_vars`
- Ansible `hash_behaviour` and `combine` filter

## Sources Consulted
- Ansible Community Documentation: Using variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: Roles - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: ansible.builtin.set_fact module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible Community Documentation: ansible.builtin.include_vars module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible Community Documentation: Ansible Configuration Settings, DEFAULT_HASH_BEHAVIOUR - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#default-hash-behaviour
- Ansible Community Documentation: Using filters to manipulate data, combine filter - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html#combining-hashes-dictionaries
- Ansible Community Documentation: Conditionals, registered variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html#conditions-based-on-registered-variables

## Issues Found
- The Mermaid precedence diagram grouped several variable sources under incorrect precedence ranges. Updated the diagram so the groups and ordering match Ansible's documented precedence list from command-line values through extra vars.
- The role defaults example used `vars:` under a role entry while describing role parameters. Ansible distinguishes role parameters from variables supplied under `vars:`, so the example was changed to pass `http_port`, `max_connections`, and `enable_ssl` directly as role parameters.
- The task vars example described task vars as the highest in the playbook. This was too broad because later precedence levels such as `include_vars`, `set_fact`, role/include parameters, and extra vars can override them. Updated the comment to say task vars are higher than block and play vars.
- The variable merging section said Ansible can merge dictionaries and lists using `hash_behaviour`. The documented `hash_behaviour` setting applies to dictionary variables, not arrays/lists, so the wording was corrected and a note was added that Ansible recommends avoiding this setting for new projects.

## Review Notes
The examples use current fully qualified Ansible built-in module names where appropriate. `ansible-playbook` was not installed in the local environment, so commands were verified against official Ansible documentation rather than executed locally.
