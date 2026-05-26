# Validation Summary: How to Use the Ansible command Module with removes Parameter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.command module
- ansible.builtin.shell module
- ansible.builtin.find module
- Linux command-line cleanup commands
- systemd

## Sources Consulted
- Ansible documentation: ansible.builtin.command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: ansible.builtin.shell module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Local installed Ansible module source for ansible.builtin.command and ansible.builtin.shell, version 2.21.0

## Issues Found
- The post said `creates` and `removes` could not be used in the same task. The current `ansible.builtin.command` documentation allows both and states that `creates` is checked before `removes`. Updated the text to reflect that order.
- The uninstall example reloaded systemd unconditionally with `when: true`, even though the surrounding section described conditional teardown. Added `register: unit_removed` to the unit-file removal task and changed the reload task to run only when the removal task changed.
- The shell-module glob note said `removes` checks glob patterns literally and that `removes` does not support glob patterns. Current `ansible.builtin.command` documentation says `removes` accepts a filename or glob pattern, and the installed shell module delegates to the command implementation. Updated the note to explain that the glob is checked before the shell command runs, and that more complex matching should use `find` with `register` and `when`.
- The symlink edge-case note said `removes` follows symlinks. The Ansible documentation does not state target-following semantics for `removes`; it documents path/glob existence checks. Reworded the example to say it works with symlink paths.

## Review Notes
Several examples use `ansible.builtin.command` for file removal, service stopping, and user deletion. They are valid for demonstrating `removes`, but production playbooks should usually prefer purpose-built modules such as `ansible.builtin.file`, `ansible.builtin.service`, and `ansible.builtin.user` when those modules express the desired state directly.
