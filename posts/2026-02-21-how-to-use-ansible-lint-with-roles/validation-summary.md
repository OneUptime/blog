# Validation Summary: How to Use ansible-lint with Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- Ansible roles
- Ansible Galaxy role metadata
- YAML configuration
- Jinja2 templates

## Sources Consulted
- Ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible-lint profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- Ansible-lint rules index: https://docs.ansible.com/projects/lint/rules/
- Ansible-lint `schema` rule documentation: https://docs.ansible.com/projects/lint/rules/schema/
- Ansible-lint `meta-incorrect` rule documentation: https://docs.ansible.com/projects/lint/rules/meta-incorrect/
- Ansible-lint `meta-no-tags` rule documentation: https://docs.ansible.com/projects/lint/rules/meta-no-tags/
- Ansible-lint `role-name` rule documentation: https://docs.ansible.com/projects/lint/rules/role-name/
- Ansible-lint `var-naming` rule documentation: https://docs.ansible.com/projects/lint/rules/var-naming/
- Ansible-lint `no-same-owner` rule documentation: https://docs.ansible.com/projects/lint/rules/no-same-owner/
- Ansible-lint `risky-file-permissions` rule documentation: https://docs.ansible.com/projects/lint/rules/risky-file-permissions/
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- Replaced the obsolete `meta-no-info` warning with `schema[meta]`, because current ansible-lint documentation lists schema validation for `meta/main.yml` and requires `galaxy_info.standalone`.
- Added `galaxy_info.standalone: true` to role metadata examples so the examples match current ansible-lint schema expectations for standalone roles.
- Corrected the `meta-no-tags` explanation and examples. Current ansible-lint checks Galaxy tags for uppercase letters and special characters, not merely for absence.
- Corrected the `meta-incorrect` explanation and examples. Current ansible-lint checks placeholder/default metadata values for fields such as `author`, `description`, `company`, and `license`.
- Changed the handler command example from shorthand command syntax to explicit `cmd:` syntax to align with ansible-lint's preference for avoiding free-form module syntax.
- Corrected the argument-spec section to say ansible-lint validates the argument specification schema, while Ansible itself validates supplied role parameters at role execution time.
- Updated the `no-same-owner` configuration comment to describe it as an optional rule useful for shared content rather than a role-specific rule.
- Updated the `yaml[line-length]` skip-list comment because that rule applies to YAML files, not Jinja2 template files.

## Review Notes
The local environment did not have `ansible-lint` installed, so CLI behavior was reviewed against the current official ansible-lint documentation rather than by running the command locally.
