# Validation Summary: How to Validate YAML Syntax for Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible and ansible-playbook
- YAML
- PyYAML
- yamllint
- ansible-lint
- pre-commit
- GitHub Actions

## Sources Consulted
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible YAML syntax documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/YAMLSyntax.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible-lint installation and configuration documentation: https://docs.ansible.com/projects/lint/installing/ and https://docs.ansible.com/projects/lint/configuring/
- ansible-lint yaml and name rule documentation: https://docs.ansible.com/projects/lint/rules/yaml/ and https://docs.ansible.com/projects/lint/rules/name/
- yamllint quickstart, configuration, and rules documentation: https://yamllint.readthedocs.io/en/stable/quickstart.html, https://yamllint.readthedocs.io/en/stable/configuration.html, and https://yamllint.readthedocs.io/en/stable/rules.html
- pre-commit documentation: https://pre-commit.com/
- PyPI release pages for current yamllint and ansible-lint versions: https://pypi.org/project/yamllint/ and https://pypi.org/project/ansible-lint/

## Issues Found
- The "Python's YAML Parser" section implied YAML parsing was built into Python. Changed it to "Using PyYAML" and added a `pip install pyyaml` command because the example depends on the PyYAML package.
- The pre-commit hook examples pinned stale versions (`yamllint` v1.33.0 and `ansible-lint` v6.22.1). Updated them to the current PyPI releases checked during review: `yamllint` v1.38.0 and `ansible-lint` v26.4.0.
- The infrastructure example used `ansible.builtin.timezone`, but the current module is `community.general.timezone`. Updated the FQCN to match the official current module documentation.
- The "Common Use Cases" section and two example comments referred to "this module" even though the post is about validation workflow, not an Ansible module. Reworded those references to avoid a misleading technical claim.

## Review Notes
- Parsed all YAML code blocks except the intentionally invalid "Common YAML Syntax Errors" block with PyYAML; the valid YAML snippets parse successfully.
- The local environment did not have `ansible-playbook`, `yamllint`, `ansible-lint`, or `pre-commit` installed, so CLI options and configuration formats were verified against official documentation rather than local `--help` output.
