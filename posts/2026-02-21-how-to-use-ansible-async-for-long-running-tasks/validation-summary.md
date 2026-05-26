# Validation Summary: How to Use Ansible async for Long-Running Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible async and poll
- ansible.builtin.async_status
- ansible.builtin.command
- ansible.builtin.apt
- ansible.builtin.raw
- ansible.builtin.uri

## Sources Consulted
- Ansible Core Documentation: Asynchronous actions and polling - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_async.html
- Ansible Community Documentation: ansible.builtin.async_status module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- Ansible Community Documentation: ansible.builtin.raw module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible Community Documentation: ansible.builtin.apt module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Community Documentation: ansible.builtin.command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Community Documentation: ansible.builtin.uri module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html

## Issues Found
- The post implied that setting `async` always immediately returns and frees Ansible to do other work. Updated the explanation to distinguish `poll > 0`, which still waits and polls, from `poll: 0`, which starts the job and moves on.
- The timeout explanation said Ansible only marks an over-time task as failed. Updated it to note that Ansible terminates the remote process after the async time limit.
- Several examples used `until: result.finished`. Updated them to `until: result is finished`, matching current Ansible documentation and avoiding version-specific assumptions about the shape of the `finished` return value.
- The multi-host backup explanation overstated async's effect on host parallelism. Updated it to account for Ansible's fork limit and to note that a high enough `forks` value is needed to start every host quickly.
- The package update explanation said async keeps the task running independently of the SSH connection. Clarified that with polling enabled it gives the task a longer runtime limit and checks status through Ansible's async wrapper.
- The limitations section claimed async in blocks with `rescue`/`always` is unreliable. Replaced that unsupported limitation with documented caveats about file transfers and exclusive locks.
- The cleanup section recommended deleting files from `~/.ansible_async/` manually. Updated it to use `async_status` with `mode: cleanup`, which is the documented cleanup method for `poll: 0` jobs.

## Review Notes
The examples use short module names such as `command`, `apt`, `raw`, `uri`, and `async_status`. These remain valid for built-in modules, though Ansible documentation recommends fully qualified collection names such as `ansible.builtin.async_status` for clearer linking and to avoid collection name conflicts.
