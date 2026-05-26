# Validation Summary: How to Debug Loop Variables in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible loops and loop_control
- ansible.builtin.debug
- ansible.builtin.assert
- Ansible registered variables
- Ansible filters: dict2items and type_debug
- Ansible CLI verbosity flags
- Ansible stdout callback formatting

## Sources Consulted
- Ansible loop guide: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- ansible.builtin.debug module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_module.html
- ansible.builtin.assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- ansible.builtin.dict2items filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dict2items_filter.html
- ansible.builtin.type_debug filter documentation: https://docs.ansible.com/projects/ansible-core/2.14/collections/ansible/builtin/type_debug_filter.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible special variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- ansible.builtin.default callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/default_callback.html
- community.general.yaml callback documentation: https://docs.ansible.com/projects/ansible/13/collections/community/general/yaml_callback.html

## Issues Found
- The post said the `debug` module's `var` parameter prints the variable with its type and structure. Official documentation describes `var` as printing a variable name/value, while type inspection is handled by filters such as `type_debug`. Changed the wording to say `var` prints the variable value and structure.
- The post recommended `stdout_callback = yaml` and `ANSIBLE_STDOUT_CALLBACK=yaml`. The old `community.general.yaml` stdout callback has been removed in community.general 12.0.0 and superseded by `result_format=yaml` in the built-in default callback. Updated the configuration and environment variable examples to `callback_result_format = yaml` and `ANSIBLE_CALLBACK_RESULT_FORMAT=yaml`.

## Review Notes
The Ansible commands could not be executed locally because `ansible-playbook` is not installed in this environment. The review was completed against current official Ansible documentation.
