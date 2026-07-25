# Validation Summary: Preventing “Variable Is Undefined” with assert, default, and mandatory

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Ansible and ansible-core
- Jinja2 templating, filters, and tests
- YAML playbooks and role defaults
- Ansible inventory and registered task results
- Ansible built-in modules, including `assert`, `debug`, `package`, `file`, `lineinfile`, `template`, `user`, and `command`

## Sources Consulted

- [Using filters to manipulate data](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html)
- [ansible.builtin.default filter](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_filter.html)
- [Jinja template designer documentation: default filter](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.default)
- [ansible.builtin.assert module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html)
- [The undef function](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_undef.html)
- [Using variables](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html)
- [Conditionals and registered variables](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html)
- [Tests](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html)
- [ansible.builtin.match test](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/match_test.html)
- [Error handling in playbooks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html)
- [ansible-inventory CLI](https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html)
- [Ansible 12 porting guide](https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_12.html)
- [ansible.builtin.dict2items filter](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dict2items_filter.html)
- [ansible.builtin.type_debug filter](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/type_debug_filter.html)
- [ansible.builtin.package module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html)
- [ansible.builtin.file module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html)
- [ansible.builtin.lineinfile module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html)
- [ansible.builtin.template module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html)
- [ansible.builtin.user module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html)
- [ansible.builtin.command module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html)

## Issues Found

- The deployment assertion used `deploy_environment` in a membership test without first checking whether it was defined. A missing value therefore caused a templating failure instead of returning the task's custom assertion message. Added `deploy_environment is defined` immediately before the membership test.
- The deployment assertion coerced `app_port` with `int` before applying the range checks. Jinja converts values such as the string `"1.5"` and the boolean `true` to `1`, so those invalid port inputs could pass. Added a digit-only `match` test before conversion, retaining support for both integer values and digit-only strings.
- The `mandatory` discussion said the filter was especially useful when undefined-variable failures had been relaxed globally. Current ansible-core deprecates `DEFAULT_UNDEFINED_VAR_BEHAVIOR` and no longer honors it; unexpected undefined values are always errors. Removed the outdated global-relaxation statement while retaining the accurate explanation that `mandatory` checks existence but not value quality.
- The controller-side description of `ansible.builtin.assert` did not state that the action is still evaluated separately for each host. Clarified that it runs on the controller for each host and supports check mode.
- The registered-variable statement omitted Ansible's documented exception for tasks skipped by tags. Limited the claim to conditional skips and explicitly noted the tag-skip exception.

## Review Notes

The examples were also exercised in a clean ansible-core 2.21.2 environment with Jinja 3.1.6. The `default` behavior for undefined and false-like values, empty loop fallbacks, `dict2items`, guarded nested access, `mandatory`, `undef(hint=...)`, digit-only port validation, and the corrected assertion failure path behaved as described. The inventory flags, module parameters, registered-result tests, `changed_when`, and `failed_when` syntax are current. All referenced links resolved to the intended documentation or author profile. No remaining deprecated APIs or version-specific errors were found.
