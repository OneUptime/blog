# Validation Summary: How to Use yamllint with Ansible Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- yamllint
- YAML
- Ansible playbooks and builtin modules
- community.general Ansible collection
- VS Code YAML extension
- GitHub Actions

## Sources Consulted
- yamllint quickstart documentation: https://yamllint.readthedocs.io/en/stable/quickstart.html
- yamllint configuration documentation: https://yamllint.readthedocs.io/en/stable/configuration.html
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html
- yamllint CLI help from yamllint 1.38.0
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.builtin.hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ibiqlik/action-yamllint GitHub Marketplace documentation: https://github.com/marketplace/actions/yaml-lint
- Red Hat VS Code YAML extension documentation: https://github.com/redhat-developer/vscode-yaml

## Issues Found
- The installation command used bare `pip install yamllint`. Updated it to `pip install --user yamllint`, matching the official yamllint quickstart's pip installation form.
- The `.yamllint` configuration allowed `yes` and `no` as truthy values while the later warning example said `enabled: yes` should warn. Changed `truthy.allowed-values` to only `['true', 'false']` so the configuration matches the guidance to use explicit booleans.
- The infrastructure example used `ansible.builtin.timezone`, which is not a current builtin module. Changed it to `community.general.timezone`, matching the official Ansible documentation.
- The GitHub Actions example used an unquoted `on` key, which is accepted by GitHub Actions but triggers yamllint's `truthy` rule when key checking is enabled. Quoted it as `'on'` so the sample is lint clean.
- The post referred to yamllint as "this module" in the common use case section and comments. Changed that wording to refer to yamllint as a tool and to describe the examples as lint-friendly formatting.

## Review Notes
- The yamllint CLI commands, rule names, ignore syntax, GitHub Action inputs, and VS Code `yaml.customTags` setting were checked and are technically valid.
- The examples use `community.general.ufw` and `community.general.timezone`, so users running only `ansible-core` need the `community.general` collection installed.
