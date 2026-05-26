# Validation Summary: How to Follow Ansible Naming Conventions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible playbooks
- Ansible roles
- Ansible variables, handlers, inventory groups, and tags
- ansible-lint configuration and CLI usage
- YAML configuration snippets

## Sources Consulted
- Ansible Lint rule documentation: var-naming, https://docs.ansible.com/projects/lint/rules/var-naming/
- Ansible Lint rule documentation: name, https://docs.ansible.com/projects/lint/rules/name/
- Ansible Lint rule documentation: role-name, https://docs.ansible.com/projects/lint/rules/role-name/
- Ansible Lint configuration documentation, https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint usage documentation, https://docs.ansible.com/projects/lint/usage/
- Ansible inventory documentation, https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible tags documentation, https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_tags.html
- Ansible handlers documentation, https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible Galaxy CLI documentation, https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html

## Issues Found
- The ansible-lint configuration snippet listed default naming rules under `enable_list`. Current ansible-lint documentation describes `enable_list` as the mechanism for opt-in rules, while rules such as `name[casing]`, `name[missing]`, `name[template]`, `role-name`, and `var-naming` are standard naming rules. I changed the snippet to note that those rules are default rules and kept only the opt-in `name[prefix]` rule in `enable_list`.
- The same snippet placed `name[missing]` in `warn_list`, which would downgrade missing task names to warnings. Because the post says every task should have a descriptive `name`, I changed `warn_list` to an empty list so the example enforces missing task names instead of warning only.

## Review Notes
The remaining examples and recommendations are consistent with current Ansible and ansible-lint guidance. The naming guidance is partly convention-based rather than a hard Ansible runtime requirement, but the post frames it as recommended practice and uses ansible-lint where enforcement is available.
