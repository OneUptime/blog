# Validation Summary: How to Override Role Files in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible variable precedence
- Ansible templates and file search paths
- Ansible handlers
- Ansible Galaxy role installation
- YAML playbooks and role metadata

## Sources Consulted
- Ansible documentation: Search paths in Ansible - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Ansible documentation: Using variables, variable precedence - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible documentation: Handlers, naming and insertion order - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible documentation: Roles and role dependencies - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible documentation: Use Ansible network roles, role defaults and extra vars precedence - https://docs.ansible.com/projects/ansible/latest/network/getting_started/network_roles.html
- Ansible Lint documentation: no-relative-paths rule for template and copy src paths - https://docs.ansible.com/projects/lint/rules/no-relative-paths/

## Issues Found
- The post incorrectly stated that, when a role uses `template: src=myfile.j2`, Ansible searches the playbook's `templates/` directory before the role's `templates/` directory. Current Ansible documentation says local relative paths are resolved first in the current role, then parent roles, then the current task file directory, and finally the current play. I updated the section to explain that a same-named playbook template does not automatically override a role template, and that an absolute path or role variable is needed for this pattern.
- The post incorrectly described handler overrides as following the same search path as tasks. Handlers are loaded into one global play-level handler scope, and precedence comes from handler insertion order. I updated the explanation to state that handlers from roles listed under `roles:` are loaded before playbook handlers, so a same-named playbook handler shadows the role handler in that case.
- The variable precedence summary was oversimplified and omitted several precedence levels, including include vars, registered vars, set_facts, role parameters, include parameters, and the distinction between command-line options and extra vars. I replaced it with a more accurate condensed ordering based on the official Ansible variable precedence documentation.

## Review Notes
The examples use current fully qualified module names such as `ansible.builtin.template`, `ansible.builtin.file`, and `ansible.builtin.systemd`. The role dependency example matches the documented `meta/main.yml` dependency format. `ansible` was not installed in the local environment, so validation was performed against current official Ansible documentation rather than local CLI execution.
