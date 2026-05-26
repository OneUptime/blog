# Validation Summary: How to Create Ansible Style Guides for Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules
- ansible-lint
- yamllint
- Ansible Galaxy CLI
- pre-commit
- Molecule

## Sources Consulted
- Ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible-lint YAML rule documentation: https://docs.ansible.com/projects/lint/rules/yaml/
- Ansible-lint FQCN rule documentation: https://docs.ansible.com/projects/lint/rules/fqcn/
- Ansible-lint var-naming rule documentation: https://docs.ansible.com/projects/lint/rules/var-naming/
- yamllint rules documentation: https://yamllint.readthedocs.io/en/v1.35.1/rules.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible include_tasks module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible block/rescue documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible Galaxy collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Molecule command documentation: https://ansible.readthedocs.io/projects/molecule/usage/

## Issues Found
- The yamllint `truthy` rule allowed `yes` and `no`, while the post also enabled ansible-lint YAML checking and used examples intended to enforce stricter style. Changed the allowed values to `true` and `false`, and updated `recurse` and `become` examples from `yes` to `true`.
- The `include_tasks` examples tagged only the dynamic include task. Ansible does not automatically inherit those tags into tasks inside dynamically included files. Changed the examples to use `apply.tags` with `tags: [always]` so the tags apply to the included tasks when tag filtering is used.

## Review Notes
The remaining examples are technically valid style-guide recommendations. Some rules, such as mandatory role prefixes and splitting task files over 50 lines, are team conventions rather than Ansible requirements.
