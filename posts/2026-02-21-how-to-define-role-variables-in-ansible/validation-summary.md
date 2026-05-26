# Validation Summary: How to Define Role Variables in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible variables and variable precedence
- YAML
- Jinja2 expressions in Ansible

## Sources Consulted
- Ansible Community Documentation: Roles - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: Using variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: ansible.builtin.include_vars module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible Community Documentation: ansible.builtin.assert module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible Community Documentation: Tests - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html

## Issues Found
- Corrected the role variable precedence level from 18 to 15. The current Ansible variable precedence list places role defaults at level 2 and role vars at level 15.
- Corrected the list of variable sources that override role vars. Added `include_vars`, role parameters, and include parameters, and replaced `include_params` with the documented "include parameters" terminology.
- Updated the simplified precedence diagram so higher-precedence entries above role vars are shown in the correct order.
- Changed the description of `vars/main/` directory handling from "auto-loaded and merged" to "auto-loaded in alphabetical order" to match the role directory documentation and avoid implying hash merge behavior.

## Review Notes
The Ansible examples use valid YAML syntax and current FQCN module names. The `assert` example uses the supported `match` test syntax and the `quiet` option documented for `ansible.builtin.assert`.
