# Validation Summary: How to Use Role Argument Validation in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Core
- Ansible roles
- Role argument validation
- `meta/argument_specs.yml`
- `ansible-doc`
- `include_role` and `import_role`

## Sources Consulted
- Ansible Community Documentation: Roles, role argument validation, and specification format: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html#role-argument-validation
- Ansible Community Documentation: AnsibleModule argument spec types and option attributes: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_program_flow_modules.html#argument-spec
- Ansible Core Documentation: `ansible.builtin.validate_argument_spec`: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/validate_argument_spec_module.html
- Ansible Community Documentation: `ansible.builtin.include_role` parameters, including `tasks_from` and `rolespec_validate`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Local runtime check with temporary `ansible-core==2.19.0` installation for validation behavior and error message shape.

## Issues Found
- The introduction said invalid role arguments fail before any tasks run. Official docs describe validation as a task inserted at the beginning of role execution, so I changed this to "before any role tasks run."
- The post referred to "Ansible 2.11" for the feature. The current module docs identify the feature as new in `ansible-core` 2.11, so I changed this to "Ansible Core 2.11."
- The sample error messages did not match current Ansible Core output. I updated them to the current `Validation of arguments failed` format.
- The supported type example omitted valid argument spec types `jsonarg`, `json`, `bytes`, and `bits`. I added them to the type demonstration.

## Review Notes
The `default` discussion is technically correct: defaults in `argument_specs.yml` document and validate expected defaults, while runtime variable defaults must come from role defaults or another variable source. The role examples use current `include_role`, `tasks_from`, nested `options`, list `elements`, `choices`, and `no_log` patterns that are supported by current Ansible Core.
