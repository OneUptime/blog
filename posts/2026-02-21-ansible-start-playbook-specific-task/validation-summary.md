# Validation Summary: How to Start Ansible Playbook at a Specific Task

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- `ansible-playbook` CLI
- `--start-at-task`
- `--step`
- Ansible facts, handlers, task registration, and playbook task flow
- Ansible modules including `apt`, `file`, `template`, `pip`, `service`, `command`, and `synchronize`

## Sources Consulted
- Ansible Community Documentation: `ansible-playbook` CLI options, including `--start-at-task`, `--list-tasks`, `--step`, `--check`, `--diff`, and `--limit`: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: Executing playbooks for troubleshooting, including `start-at-task`, `step` mode, and the limitation for dynamically reused roles/tasks: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_startnstep.html
- Ansible source code: `PlayIterator` matching logic for `start_at_task`, including exact and `fnmatch` matching: https://github.com/ansible/ansible/blob/devel/lib/ansible/executor/play_iterator.py
- Ansible source code: `TaskQueueManager` handling of `start_at_task` across plays: https://github.com/ansible/ansible/blob/devel/lib/ansible/executor/task_queue_manager.py
- Ansible Core Documentation: `ansible.builtin.pip` module parameters and requirements: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible Community Documentation: `ansible.posix.synchronize` module and collection requirements: https://docs.ansible.com/ansible/latest/collections/ansible/posix/synchronize_module.html

## Issues Found
- The post stated that `--start-at-task` task-name matching is exact only. Ansible performs exact matching and also supports shell-style wildcard matching through `fnmatch`. Updated the matching section to recommend exact names as the safest approach while noting wildcard support, and added a working wildcard example.
- The post did not mention Ansible's documented limitation that `--start-at-task` does not work with tasks inside dynamically reused roles or tasks such as `include_role` or `include_tasks`. Added a caveat so the broad guidance does not overstate where the option works.

## Review Notes
- The `synchronize` examples rely on the `ansible.posix` collection, which is included with many `ansible` package installations but not with `ansible-core` alone. Future revisions could use fully qualified collection names for module clarity, but the current short module names remain valid when the relevant collections are installed.
- Local `ansible-playbook` was not installed in the review environment, so CLI behavior was verified against official documentation and Ansible source code rather than local command execution.
