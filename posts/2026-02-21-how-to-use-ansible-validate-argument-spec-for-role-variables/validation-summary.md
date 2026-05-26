# Validation Summary: How to Use Ansible validate_argument_spec for Role Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible roles
- Ansible role argument specifications
- ansible.builtin.validate_argument_spec
- YAML

## Sources Consulted
- Ansible role argument validation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html#role-argument-validation
- ansible.builtin.validate_argument_spec module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/validate_argument_spec_module.html
- AnsibleModule argument spec documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_program_flow_modules.html#argument-spec

## Issues Found
- The post implied that `default` values in `meta/argument_specs.yml` apply role variable defaults. Updated the text to clarify that actual role defaults should live in `defaults/main.yml`, while the argument spec `default` field documents the same value.
- The `webserver_worker_processes` example used `type: int` with a string default and string choice (`auto`). Updated the option to `type: str` and quoted numeric choices so the choices match the declared type.
- The type examples were labeled as "All supported types" even though Ansible supports additional argument spec types such as `jsonarg`, `json`, `bytes`, and `bits`. Updated the label to "Common supported types."
- The validation-flow diagram said argument spec validation applies defaults. Updated that step to reference role defaults instead.
- The sample failure output was presented as an exact `ERROR:` line. Updated it to say the error includes the missing-argument message, since Ansible reports validation failures in normal task failure output.

## Review Notes
- `ansible-playbook` was not installed in the local environment, so examples were verified against official Ansible documentation rather than by executing a playbook locally.
