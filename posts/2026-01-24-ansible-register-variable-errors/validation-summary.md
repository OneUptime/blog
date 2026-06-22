# Validation Summary: How to Fix 'Register Variable' Capture Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible registered variables
- Ansible loops
- Ansible conditionals
- Ansible blocks and rescue
- Ansible async tasks and async_status
- Ansible include_tasks
- Ansible filters: from_json, from_yaml, default, type_debug
- YAML

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible asynchronous actions and polling documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- ansible.builtin.async_status module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- ansible.builtin.include_tasks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible common return values documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/common_return_values.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible filters documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- ansible.builtin.from_json filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/from_json_filter.html
- ansible.builtin.from_yaml filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/from_yaml_filter.html
- Ansible blocks documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html

## Issues Found
- The final "Complete example with best practices" used `map('combine', {'name': item.item})` inside a `set_fact` task that did not define a loop item. This would fail because `item` is undefined in that task. I changed the example to store `service_check.results` directly and report each service name with the registered result's existing `item` field.

## Review Notes
The post's main explanations align with current Ansible documentation: registered variables contain task status and output, skipped or failed tasks still register status information, looped registered results are stored under `results`, `poll: 0` async tasks need `async_status` for later output, and JSON/YAML command output must be parsed before nested access. The local environment did not have Ansible installed, so validation was performed against official documentation rather than local `ansible-playbook --syntax-check`.
