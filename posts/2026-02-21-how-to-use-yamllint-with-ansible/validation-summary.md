# Validation Summary: How to Use yamllint with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- yamllint
- Ansible
- ansible-lint
- YAML
- pre-commit
- GitHub Actions

## Sources Consulted
- yamllint configuration documentation: https://yamllint.readthedocs.io/en/stable/configuration.html
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html
- yamllint integration documentation: https://yamllint.readthedocs.io/en/stable/integration.html
- yamllint PyPI release page: https://pypi.org/project/yamllint/
- ansible-lint YAML rule documentation: https://docs.ansible.com/projects/lint/rules/yaml/
- ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- ansible-lint PyPI release page: https://pypi.org/project/ansible-lint/
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- pre-commit documentation: https://pre-commit.com/

## Issues Found
- Corrected yamllint configuration discovery. The post said yamllint only checks the current directory for `.yamllint.yml`, `.yamllint.yaml`, and `.yamllint`; current yamllint also searches parent directories, supports `YAMLLINT_CONFIG_FILE`, and checks `$XDG_CONFIG_HOME/yamllint/config`.
- Updated the comments rule to use `min-spaces-from-content: 1`. Current ansible-lint documents that incompatible custom yamllint settings can cause ansible-lint to refuse to run, and it requires this value for its YAML rule compatibility.
- Fixed octal value guidance. The post described `0644` as explicit octal, but yamllint treats leading-zero values such as `0644` as implicit octal. The configuration now forbids both implicit and explicit unquoted octals, matching ansible-lint compatibility guidance and Ansible's recommendation to quote file modes.
- Updated pre-commit example versions from `yamllint` `v1.35.1` and `ansible-lint` `v24.10.0` to current release tags `v1.38.0` and `v26.4.0`.

## Review Notes
The remaining commands and examples are technically valid. The CI example installs unpinned latest packages, which is acceptable for a simple tutorial but could be pinned in production workflows for reproducibility.
