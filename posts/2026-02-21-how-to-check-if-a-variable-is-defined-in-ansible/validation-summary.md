# Validation Summary: How to Check if a Variable is Defined in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Jinja2 tests and filters
- Ansible conditionals
- Ansible configuration
- Ansible builtin modules: debug, user, apt, file, copy, template

## Sources Consulted
- Ansible `ansible.builtin.defined` test documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/defined_test.html
- Ansible filters documentation, including `default`, `omit`, `mandatory`, and nested undefined behavior: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible configuration setting `DEFAULT_UNDEFINED_VAR_BEHAVIOR`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#default-undefined-var-behavior
- Ansible `undef()` function documentation: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_templating_undef.html
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Local validation with `ansible-playbook` from `ansible-core` 2.19.10 installed under `/tmp/ansible-review-pkg`.

## Issues Found
- The nested-variable section said `my_dict.key is defined` fails when `my_dict` is undefined. Current Ansible behavior returns another undefined value for nested undefined attributes, so the test evaluates to `false`. Updated the text to reflect modern Ansible while preserving the recommendation for explicit parent checks.
- The optional user password example used `user_password`, which could imply a plain-text password on Linux/POSIX. The `ansible.builtin.user` module expects an encrypted hash on Linux/POSIX, so the example now uses `user_password_hash`.
- The robust `api_key` check used `api_key | length > 0` after only checking that `api_key` was defined. A defined `null` value fails the `length` filter. Added `api_key is not none` before the length check.
- The `error_on_undefined_vars = false` comment said undefined variables are treated as empty strings. Current Ansible documentation says this option is deprecated and no longer used, and its historical behavior was to render undefined template expressions as written. Updated the section to keep the default strict-behavior recommendation and warn not to rely on changing the setting.

## Review Notes
The main examples align with current Ansible/Jinja behavior after the fixes. The `custom_error_pages` loop uses both `default([])` and `when: custom_error_pages is defined`; this is redundant but technically valid.
