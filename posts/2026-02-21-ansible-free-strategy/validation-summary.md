# Validation Summary: How to Use the Ansible free Strategy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbook strategies
- Ansible `free` and `linear` strategy behavior
- Ansible `forks`, `serial`, `run_once`, handlers, delegation, and facts
- Ansible callback plugins
- Ansible `apt`, `template`, `service`, `stat`, and `debug` modules

## Sources Consulted
- Ansible Community Documentation: `ansible.builtin.free` strategy - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/free_strategy.html
- Ansible Community Documentation: Controlling playbook execution: strategies and more - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible Core Documentation: Callback plugins - https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible Community Documentation: `community.general.dense` callback - https://docs.ansible.com/projects/ansible/latest/collections/community/general/dense_callback.html
- Ansible Community Documentation: `ansible.builtin.apt` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Community Documentation: `ansible.builtin.service` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible Lint Documentation: `run-once` rule - https://docs.ansible.com/projects/lint/rules/run-once/

## Issues Found
- The monitoring section used `callback_whitelist`, which is the older callback-enabling setting. Current Ansible callback documentation uses `callbacks_enabled`, so the configuration snippet was updated.
- The monitoring section set `stdout_callback = dense` without noting that the current `dense` callback lives in the `community.general` collection. The snippet now uses `stdout_callback = community.general.dense`, and the text notes the collection requirement for `ansible-core` users.
- The post said the dense callback shows aggregated counts per task. The official dense callback documentation describes it as minimal stdout output, not aggregated per-task reporting, so that sentence was corrected.

## Review Notes
- The core explanation of the `free` strategy, including per-batch execution with `serial`, interaction with `forks`, and the warning about cross-host ordering assumptions, matches the current Ansible documentation.
- The local environment did not have `ansible-playbook` or `ansible-doc` installed, so command/module checks were performed against official Ansible documentation instead of local CLI output.
