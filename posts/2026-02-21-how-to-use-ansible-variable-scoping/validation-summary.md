# Validation Summary: How to Use Ansible Variable Scoping (Play, Block, Task, Role)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible variable scopes and precedence
- Ansible roles
- `ansible.builtin.import_role`
- `ansible.builtin.include_role`
- `ansible.builtin.set_fact`
- Registered variables

## Sources Consulted
- Ansible Community Documentation: Using variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: `ansible.builtin.import_role` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_role_module.html
- Ansible Community Documentation: `ansible.builtin.include_role` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html

## Issues Found
- The post originally listed facts under play scope and implied variables set in a task are host-scoped. Updated the explanation to distinguish task-level `vars` from host-scoped variables created by `set_fact` and `register`, and moved facts to host scope.
- The simplified variable precedence list omitted `include_vars` and role/include parameters. Added them and kept the order aligned with Ansible's documented precedence.
- The `include_role` versus `import_role` example implied task `vars` passed to role inclusion were exposed to subsequent tasks. Updated the example and explanation to focus on role defaults and vars, and noted `include_role public: true` for exposing included role variables to later tasks.
- The precedence demo incorrectly showed task-level `vars` overriding a previous `set_fact`. Corrected the expected output because `set_fact` has higher precedence than task vars.

## Review Notes
The post uses a simplified precedence list, which is appropriate for the guide, but Ansible's full precedence table includes finer-grained inventory group and host variable sources. The examples are illustrative and assume the referenced roles and template files exist.
