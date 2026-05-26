# Validation Summary: How to Use Ansible loop with Async Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible asynchronous tasks
- Ansible loops
- ansible.builtin.async_status
- ansible.builtin.command
- ansible.builtin.shell
- ansible.builtin.get_url
- ansible.builtin.stat
- PostgreSQL pg_dump

## Sources Consulted
- Ansible Core Documentation: Asynchronous actions and polling: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_async.html
- Ansible Community Documentation: ansible.builtin.async_status module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- Ansible Community Documentation: ansible.builtin.command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Community Documentation: ansible.builtin.shell module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible Community Documentation: ansible.builtin.include_tasks module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible Community Documentation: ansible.builtin.get_url module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible Community Documentation: ansible.builtin.stat module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible Community Documentation: DEFAULT_POLL_INTERVAL configuration setting: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#default-poll-interval

## Issues Found
- The package compilation example used `ansible.builtin.command` with a command string containing `&&`. The Ansible command module does not run commands through a shell, so shell operators are not processed. Changed that task to `ansible.builtin.shell`, which is the correct module for shell command lines such as `./configure && make`.
- The async polling examples used direct `.finished` checks. Current Ansible documentation uses the `is finished` test for async status results, and this also handles the return value shape consistently across Ansible versions. Updated the polling examples to use `until: <registered_result> is finished`.

## Review Notes
- The main async pattern in the post is accurate: use `async` with `poll: 0`, register job IDs, then poll them later with `ansible.builtin.async_status`.
- The post correctly states that the default poll interval is 15 seconds and that `poll: 0` tasks are not automatically waited on.
- Future improvements could mention that `poll: 0` async job cache files are not automatically cleaned up and can be removed with `async_status` using `mode: cleanup`.
