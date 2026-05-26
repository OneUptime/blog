# Validation Summary: How to Use ansible-lint to Detect Deprecated Syntax

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-core
- ansible-lint
- YAML
- GitHub Actions
- Python CLI scripting

## Sources Consulted
- Ansible Lint documentation: https://docs.ansible.com/projects/lint/
- ansible-lint rule index: https://docs.ansible.com/projects/lint/rules/
- ansible-lint `deprecated-module` rule: https://docs.ansible.com/projects/lint/rules/deprecated-module/
- ansible-lint `deprecated-local-action` rule: https://docs.ansible.com/projects/lint/rules/deprecated-local-action/
- ansible-lint `no-free-form` rule: https://docs.ansible.com/projects/lint/rules/no-free-form/
- ansible-lint `fqcn` rule: https://docs.ansible.com/projects/lint/rules/fqcn/
- ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- ansible-lint installation documentation: https://docs.ansible.com/projects/lint/installing/
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible `include` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_module.html

## Issues Found
- Replaced the nonexistent `deprecated-command-syntax` rule with the current `no-free-form` rule and updated the related examples.
- Clarified that FQCN findings are ansible-lint best-practice/formatting findings, not general Ansible deprecations of short module names.
- Replaced the outdated `docker` module example with the official `ansible.netcommon.net_vlan` deprecated-module example and current replacement style.
- Corrected focused scan commands so deprecation-only scans use `-t deprecations`, while FQCN and free-form cleanup also includes `-t syntax -t formatting`.
- Corrected the `.ansible-lint` configuration snippet by removing unsupported target-version comments, avoiding `strict: true` while warning-only FQCN findings are configured, and using the supported `tags` setting.
- Corrected the JSON parsing script to count ansible-lint `-f json` Code Climate output by `check_name` instead of a nonexistent `rule.id` field.
- Corrected version-specific guidance: ansible-lint does not have a one-to-one version mapping with target Ansible releases, and official guidance recommends using a recent ansible-lint version.
- Corrected the project-wide suppression example to skip `deprecated-module` rather than a nonexistent `deprecated-module[specific-module]` subrule.

## Review Notes
The post is technically relevant and salvageable. The remaining examples are general guidance; actual deprecated module replacements should still be checked against the module documentation for the collections used by a given project.
