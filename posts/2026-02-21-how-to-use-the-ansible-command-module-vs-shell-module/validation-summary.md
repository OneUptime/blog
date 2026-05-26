# Validation Summary: How to Use the Ansible command Module vs shell Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.command module
- ansible.builtin.shell module
- ansible.builtin.stat module
- Ansible playbook YAML
- POSIX shell, Bash, and Zsh command execution

## Sources Consulted
- Ansible documentation: ansible.builtin.command module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: ansible.builtin.shell module - https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible documentation: playbook tests and path tests - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible documentation: ansible.builtin.file test - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_test.html
- Ansible documentation: ansible.builtin.service module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible documentation: ansible.builtin.user module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible documentation: ansible.builtin.copy module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html

## Issues Found
- The post stated that environment variable expansion does not work with the `command` module. Current Ansible documentation notes that `command` has `expand_argument_vars`, enabled by default since ansible-core 2.16, which expands arguments like `$HOME` using Python. I updated the wording to distinguish shell-style expansion from Ansible's limited argument expansion.
- The here-string example used `<<<` with the default `shell` module shell. The module defaults to `/bin/sh`, and here strings are not portable POSIX `/bin/sh` syntax. I changed the example to a portable here document.
- The security example said the `command` module treats the whole string as a single argument. That is misleading for free-form command strings with spaces. I changed the example to use `argv` so the untrusted filename is passed as one argument without shell interpretation.
- The shell quoting example manually wrapped a variable in single quotes. Official Ansible shell documentation recommends the `quote` filter for templated variables. I changed the example to `{{ safe_filename | quote }}`.
- The zsh example used `when: "'/bin/zsh' is file"`, which checks the controller filesystem, not the managed host. I changed it to use `ansible.builtin.stat` on the target and then check the registered result.

## Review Notes
Ansible is not installed in the local workspace, so the examples were not executed with `ansible-playbook`. The YAML code fences were parsed successfully with PyYAML after the corrections.
