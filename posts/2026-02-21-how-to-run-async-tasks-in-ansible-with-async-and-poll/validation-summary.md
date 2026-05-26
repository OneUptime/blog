# Validation Summary: How to Run Async Tasks in Ansible with async and poll

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible asynchronous tasks with `async` and `poll`
- `ansible.builtin.async_status`
- Ansible privilege escalation with `become`
- Ansible handlers
- YAML

## Sources Consulted
- Ansible Community Documentation: Asynchronous actions and polling - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- Ansible Community Documentation: `ansible.builtin.async_status` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- Ansible Community Documentation: `ansible.builtin.command` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Community Documentation: Handlers: running operations on change - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible Community Documentation: Understanding privilege escalation: become - https://docs.ansible.com/ansible/latest/user_guide/become.html

## Issues Found
- The compile example used `command: make -j$(nproc) all`, but the Ansible `command` module does not process shell command substitution. Changed it to `shell: make -j"$(nproc)" all` so `$(nproc)` is expanded by the remote shell.
- The introductory async description said Ansible immediately disconnects when `async` is set. This is only accurate for `poll: 0`; with positive polling Ansible waits and polls until the task completes, fails, or times out. Reworded the description to distinguish those behaviors.
- The limitations section said async tasks do not get privilege escalation by default. Async tasks follow normal Ansible privilege escalation rules, including play-level `become`. Updated the wording accordingly.
- The handlers limitation said handlers are not notified until the playbook finishes. Handlers are notified by changed tasks but run after the relevant play section, commonly at the end of the play. Updated the wording to say handlers are not run until the play finishes.

## Review Notes
- Ansible's official async documentation notes that `poll: 0` jobs are not automatically cleaned up; use `async_status` with `mode: cleanup` when cleanup is required.
- The examples use short module names such as `async_status`, `command`, and `apt`. These are still valid for built-in modules, although Ansible documentation recommends fully qualified collection names for clearer links and to avoid naming conflicts.
