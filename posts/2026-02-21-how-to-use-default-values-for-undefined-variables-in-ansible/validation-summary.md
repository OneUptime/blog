# Validation Summary: How to Use Default Values for Undefined Variables in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible configuration
- Jinja2 templating and filters
- Ansible tests and conditionals
- community.general json_query filter

## Sources Consulted
- Ansible default filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_filter.html
- Jinja default filter documentation: https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.default
- Ansible optional module parameters with omit: https://docs.ansible.com/ansible/3/user_guide/playbooks_filters.html#making-variables-optional
- Ansible community.general.json_query filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/json_query_filter.html
- Ansible tests and type tests documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible configuration setting DEFAULT_UNDEFINED_VAR_BEHAVIOR: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#default-undefined-var-behavior

## Issues Found
- The `community.general.json_query` example did not mention that it requires the `community.general` collection and the `jmespath` Python package on the controller. Added a dependency note so the example can be used correctly with ansible-core installations.
- The `omit` section had a comment referring to `ssl_cert` and `ssl_certificate`, but the example actually omitted the `template` module's `validate` parameter based on `nginx_validate_command`. Updated the comment to match the code.
- The list validation example used `allowed_ips is iterable` while saying it validated a list. Ansible documents strings and dictionaries as iterable too, so this would not enforce the stated type. Changed the assertion to require a sequence that is not a string and not a mapping.
- The `error_on_undefined_vars` section described nonexistent `error`, `warn`, and `ignore` choices. The current Ansible setting is boolean, defaults to `True`, and latest Ansible documentation marks it deprecated and no longer used. Updated the text and snippet comments to reflect current documentation and avoid recommending the deprecated setting for new playbooks.

## Review Notes
- Ansible was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `ansible-playbook`.
