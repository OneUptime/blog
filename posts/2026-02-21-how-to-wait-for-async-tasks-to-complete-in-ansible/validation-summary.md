# Validation Summary: How to Wait for Async Tasks to Complete in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible asynchronous tasks
- ansible.builtin.async_status
- ansible.builtin.command
- ansible.builtin.shell
- ansible.builtin.find

## Sources Consulted
- Ansible Community Documentation: Asynchronous actions and polling - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- Ansible Community Documentation: ansible.builtin.async_status module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- Ansible Community Documentation: ansible.builtin.command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Community Documentation: ansible.builtin.shell module - https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible Community Documentation: ansible.builtin.find module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html

## Issues Found
- Updated the `finished` and `started` explanation to reflect current ansible-core behavior: these values are booleans in ansible-core 2.19 and newer, while older versions returned `0` and `1`.
- Changed the `sleep 30 && echo "done"` example from `command` to `shell`, because shell operators such as `&&` require the shell module.
- Updated the loop-based success assertion to check `item.finished` as a boolean instead of comparing it to `1`.
- Renamed the timeout cleanup task from "Kill the background process" to "Clean up the async status file" because `async_status` with `mode: cleanup` removes the async job cache file and does not kill the process.
- Changed the manual async cache cleanup path from `~/.ansible_async` to `{{ ansible_env.HOME }}/.ansible_async`, because the `find` module expects fully qualified paths.

## Review Notes
The short module names used in the examples are still valid for built-in Ansible modules. The official documentation recommends fully qualified collection names for clearer linking and to avoid naming conflicts, but this is not required for correctness.
