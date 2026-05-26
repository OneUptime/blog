# Validation Summary: How to Use the mandatory Filter in Ansible Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible playbooks
- Ansible filters
- Ansible `assert` module
- Jinja2 templating and tests
- YAML

## Sources Consulted
- Ansible `ansible.builtin.mandatory` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/mandatory_filter.html
- Ansible playbook filters documentation, including mandatory values and `undef()`: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible playbook tests documentation for `match`, `search`, and Jinja test syntax: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible `undef()` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_undef.html
- Ansible `ansible.builtin.mapping` test documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/mapping_test.html

## Issues Found
- The post incorrectly stated that `mandatory` fails for undefined, empty, or `None` values. Ansible documents `mandatory` as failing when a value is undefined; local inspection of Ansible 2.21.0 behavior also confirmed that empty strings and `None` are returned unchanged. Updated the explanation to distinguish existence checks from non-empty/type validation.
- The examples used self-referential variables such as `deploy_version: "{{ deploy_version | mandatory }}"`. Updated the basic example to assign required aliases from the external variables to avoid presenting a recursive variable pattern.
- The role defaults examples used self-referential `mandatory` defaults. Ansible documentation recommends `undef(hint=...)` when a role default must be overridden, so those snippets were corrected to use `undef()`.
- The custom-message examples used positional `mandatory(...)` arguments. The current Ansible documentation presents the custom message as the `msg` keyword parameter, so the examples were updated to `mandatory(msg='...')`.
- The sample error output included a task-name line that could be misleading once the variables are templated during execution. Simplified it to show the relevant failure message.

## Review Notes
The remaining `assert` examples are appropriate for validation beyond variable existence. Future improvements could use fully qualified collection names such as `ansible.builtin.assert` and `ansible.builtin.mandatory` for documentation linking, but the short names are valid for built-in Ansible plugins.
