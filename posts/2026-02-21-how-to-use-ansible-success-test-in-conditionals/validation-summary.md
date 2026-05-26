# Validation Summary: How to Use Ansible success Test in Conditionals

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible conditionals and Jinja tests
- Registered task results
- Ansible error handling with `ignore_errors`
- Ansible modules: `command`, `uri`, `apt`, `git`, `copy`, `systemd`, `pause`, `debug`, `fail`, and `meta`

## Sources Consulted
- Ansible `ansible.builtin.success` test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/success_test.html
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible blocks documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible playbook keywords documentation: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.meta` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/meta_module.html
- Ansible loops and retry documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html

## Issues Found
- The post said the `success` test evaluates a task result's return code. Updated this to match the official `success` test behavior: it checks whether the result is not marked as failed. The return code matters for command-like modules because those modules use it to decide whether the task failed.
- The post said a skipped task is neither successful nor failed and that `connectivity is success` would not run for a skipped registered result. Current ansible-core records skipped registered results with `failed: false`, so `is success` can be true for a skipped task. Updated the explanation and example to use both `is success` and `is not skipped` when the intent is "ran and succeeded."
- The health-check deployment example used `ansible.builtin.fail` for a task described as skipping unhealthy hosts. `fail` marks the host failed instead of ending that host cleanly. Replaced it with `ansible.builtin.meta: end_host`, which ends the play for the current host without failing it.
- The fallback-source example placed `register` on a block. `register` is not a valid block keyword in current Ansible. Moved `register: source_build` onto the `Build and install` command task so the example passes syntax checking.

## Review Notes
Validated all YAML code fences with `ansible-playbook --syntax-check` using a temporary ansible-core 2.21.0 install. Also ran a local playbook check to confirm skipped registered-result behavior for `is success`, `is failed`, and `is skipped`.
