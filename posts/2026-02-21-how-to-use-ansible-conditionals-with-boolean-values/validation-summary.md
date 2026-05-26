# Validation Summary: How to Use Ansible Conditionals with Boolean Values

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible conditionals
- Ansible filters (`bool`, `default`, `ternary`, `type_debug`)
- YAML boolean values
- Jinja2 template conditionals

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible `ansible.builtin.bool` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/bool_filter.html
- Ansible `ansible.builtin.type_debug` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/type_debug_filter.html
- Ansible `ansible.builtin.default` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_filter.html
- Ansible `ansible.builtin.ternary` filter documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/ternary_filter.html
- Ansible variables and `--extra-vars` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible YAML syntax documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/YAMLSyntax.html
- Ansible-core 2.19 porting guide, conditionals and templating changes: https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_core_2.19.html

## Issues Found
- The post said a bare non-empty string in a `when` conditional would always run, including `"false"`. This is incomplete for current Ansible: ansible-core 2.19 requires conditionals to produce a boolean result and can fail on implicit string truthiness. I updated the explanation and example so the code remains valid while still explaining why string boolean values must be converted explicitly.
- The post described always using `bool` as having "no downside." Ansible's `bool` filter is intended for recognized boolean-like values and warns on invalid values, so I narrowed the advice to variables intended to be booleans and mentioned explicit comparisons or `truthy`/`falsy` tests for arbitrary strings.
- The introduction and extra-vars wording implied all string boolean mistakes only cause always-run/always-skip behavior and that all listed sources necessarily return strings. I adjusted the wording to include current failure behavior and to say those sources can produce strings, with `key=value` extra vars specifically identified as string values.

## Review Notes
The remaining examples use current Ansible syntax and documented filters. The YAML section is accurate for Ansible's documented YAML behavior, but lowercase `true` and `false` remain the preferred style for compatibility with default yamllint settings.
