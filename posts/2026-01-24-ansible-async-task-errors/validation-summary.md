# Validation Summary: How to Fix 'Async' Long Running Task Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbook async and polling
- ansible.builtin.async_status
- ansible.builtin.command
- ansible.builtin.shell
- ansible.builtin.apt
- ansible.posix.synchronize
- ansible.builtin.unarchive
- YAML playbook syntax

## Sources Consulted
- Ansible asynchronous actions and polling documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- ansible.builtin.async_status module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.posix.synchronize module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- ansible.builtin.unarchive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html

## Issues Found
- The introduction stated that Ansible async generally avoids blocking playbook execution. Updated it to distinguish `poll: 0`, which continues without waiting, from positive polling, which still blocks until completion, failure, or timeout.
- The timeout-handling example would fail the polling task after retries were exhausted before the following timeout-handling block could run. Added `failed_when: false` and changed the conditional to `when: not job_status.finished` so the example can handle the timeout path.
- The parallel async example tried to evaluate `job_results.results` inside the same looped task that was registering it. Changed the polling condition to evaluate the current loop item with `until: job_results.finished`.
- The progress-monitoring example removed the progress file immediately after writing `100`, so the polling task could miss the completion value and wait unnecessarily. Removed the inline cleanup so the progress value remains observable.

## Review Notes
- YAML code fences were parsed locally with PyYAML successfully. Ansible is not installed in the local environment, so `ansible-playbook --syntax-check` could not be run.
- The Ansible documentation notes that async tasks with `poll: 0` are not automatically cleaned up and should be cleaned with `async_status mode: cleanup` when appropriate.
