# Validation Summary: How to Fix Ansible YAML syntax error in Playbooks

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Ansible playbooks
- YAML syntax
- PyYAML
- yamllint
- ansible-lint
- Ansible built-in modules
- community.general Ansible collection

## Sources Consulted
- Ansible YAML Syntax documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/YAMLSyntax.html
- Ansible lint syntax-check rule: https://docs.ansible.com/projects/lint/rules/syntax-check/
- Ansible error handling in playbooks: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation

## Issues Found
- The indentation example labeled as wrong used six spaces before the task item, which is nonstandard but still valid YAML. Changed it to a genuinely invalid indentation example where the `command` key is misaligned under the list item.
- The special-character guidance was too broad because many listed characters are only special in certain YAML positions. Clarified that quoting is needed when characters are used as YAML syntax, when a value contains a colon followed by a space, when values start with YAML indicator characters, or when automatic type conversion should be avoided.
- The "Common Use Cases" introduction and example comments referred to "this module", but the article is about YAML syntax rather than an Ansible module. Updated the wording to refer to YAML validation and the patterns shown in the article.
- The infrastructure example used `ansible.builtin.timezone`, but the current documented fully qualified module name is `community.general.timezone`. Updated the example to use `community.general.timezone`.

## Review Notes
- Ansible was not installed in the local environment, so `ansible-playbook --syntax-check` could not be run. YAML parsing was checked locally with PyYAML 6.0.1, and Ansible module names/options were verified against current official documentation.
- The playbook examples are syntactically valid YAML, but some operational details remain environment-dependent, such as whether the target host has `ufw`, whether the `community.general` collection is installed, and whether the SSH service is named `sshd` on the target distribution.
