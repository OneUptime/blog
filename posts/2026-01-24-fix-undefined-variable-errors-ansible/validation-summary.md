# Validation Summary: How to Fix 'Undefined Variable' Errors in Ansible

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible variables and variable precedence
- Jinja2 filters in Ansible
- Ansible facts
- Registered variables
- Role defaults and role argument specs

## Sources Consulted
- Ansible documentation: Using variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible documentation: Using filters to manipulate data - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible documentation: Controlling how Ansible behaves: precedence rules - https://docs.ansible.com/projects/ansible/latest/reference_appendices/general_precedence.html
- Ansible documentation: Conditionals - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible documentation: Discovering variables: facts and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible documentation: Roles and role argument validation - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible 12 Porting Guide - https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_12.html

## Issues Found
- The undefined-variable flowchart referenced `ANSIBLE_UNDEFINED_VAR_BEHAVIOR` warning/empty-string behavior. Current Ansible 12 documentation says `DEFAULT_UNDEFINED_VAR_BEHAVIOR` is deprecated and no longer has effect, and unexpected undefined variables are always errors. Updated the diagram to show default/guard handling instead.
- The variable scope solution claimed variables could be defined at the playbook level using a play with `hosts: all`. Play variables are scoped to the play that defines them and do not carry into later plays. Replaced the example with a shared `vars_files` pattern and kept `group_vars`/`host_vars` as another correct option.
- The `set_fact` example described `cacheable` facts as simply persistent. Updated the wording to clarify that `set_fact` creates host-scoped variables, and that `cacheable: yes` should be used only with configured fact caching for later runs.
- The `omit` example used a placeholder `backup_module`, which is not an Ansible builtin module. Replaced it with a working `file` module example matching Ansible's documented optional-parameter pattern.
- The variable precedence diagram omitted several precedence levels and placed some variables in the wrong relative order. Updated the diagram to match Ansible's documented low-to-high precedence order more closely.
- The registered-variable section said a registered variable is undefined when a task is skipped. Ansible documents that skipped tasks still register a result unless skipped by tags. Updated the text to explain that nested fields such as `stdout` may be undefined on a skipped result.

## Review Notes
The examples use short module names such as `debug`, `template`, `set_fact`, and `file`. These are still valid for built-in modules, though Ansible documentation often recommends fully qualified collection names such as `ansible.builtin.debug` for clarity and unambiguous linking.
