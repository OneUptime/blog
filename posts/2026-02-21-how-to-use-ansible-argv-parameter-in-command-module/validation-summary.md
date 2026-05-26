# Validation Summary: How to Use Ansible argv Parameter in command Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.command module
- ansible.builtin.shell module
- YAML playbooks
- Jinja2 filters

## Sources Consulted
- Ansible official documentation: ansible.builtin.command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible official documentation: ansible.builtin.shell module - https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html

## Issues Found
- The post implied that `cmd` in the `command` module is processed by a shell. I changed this to explain that `argv` avoids command-string argument splitting, while the `command` module itself still does not run through a shell.
- The post stated that `$A` would be interpreted by the shell without `argv`. I updated this to reflect current Ansible behavior: the `command` module does not use a shell, but Ansible can expand environment-variable references by default through `expand_argument_vars`.
- The security section described `argv` as safer than `cmd` because `cmd` might execute shell injection. I corrected this to compare `argv` with building shell commands, since `ansible.builtin.shell` is the module that runs through `/bin/sh`.
- The dynamic `argv` example relied on implicit Jinja2 filter precedence. I added parentheses around the filtered exclude-pattern list so the list concatenation is unambiguous.
- The summary said to stick with `cmd` or `shell` for shell features. I corrected this because `cmd` in the `command` module still does not support shell features such as pipes and redirects.

## Review Notes
The examples are technically valid for POSIX targets. For real playbooks, Ansible purpose-built modules such as `ansible.builtin.user`, `ansible.builtin.file`, and `ansible.builtin.unarchive` would usually be more idempotent than raw `command` tasks, but that is outside this post's focused explanation of `argv`.
