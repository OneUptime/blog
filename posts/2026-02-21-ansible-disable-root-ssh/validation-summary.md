# Validation Summary: How to Use Ansible to Disable Root SSH Login

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible builtin modules: package, group, user, file, copy, template, command, assert, service, wait_for, debug, lineinfile
- OpenSSH client and server configuration
- Linux sudoers configuration
- Linux user and group management

## Sources Consulted
- Ansible `ansible.builtin.lineinfile` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.user` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.builtin.copy` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.service` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible playbook execution strategy and `serial` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenSSH `sshd(8)` manual: https://man.openbsd.org/sshd
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh

## Issues Found
- The disable-root role had two consecutive tasks managing the same `PermitRootLogin` directive. The second task was labeled as disabling password authentication for root, but it actually set `PermitRootLogin no` again and overrode the `ssh_permit_root_login` variable. Removed the duplicate task so the configured `PermitRootLogin` value is applied once.
- The `lineinfile` task wrote `sshd_config` before validation. Added `validate: '/usr/sbin/sshd -t -f %s'`, which uses Ansible's supported pre-write validation flow and OpenSSH's documented test mode.
- The `PermitRootLogin` regular expression did not match common whitespace/comment forms such as `# PermitRootLogin prohibit-password`. Updated the regexp to allow leading whitespace and optional whitespace after `#`.
- The handler hardcoded the SSH service as `sshd`, which is not portable across common Linux distributions such as Debian and Ubuntu where the service is usually `ssh`. Added an `ssh_service_name` variable and used it in the handler and rollback play.
- The user creation task added users to supplementary groups that were not all created by the playbook. Replaced the single `sshusers` group task with a loop that ensures every listed supplementary group exists before creating users.
- The sudo configuration comment suggested enabling password-required sudo, but the verification task runs non-interactively over SSH and the playbook does not set user passwords. Clarified that the shown verification path expects passwordless sudo.
- The emergency rollback task used a narrower `PermitRootLogin` regexp and did not validate the edited SSH config before restart. Updated it to match the main task's regexp and validation behavior.

## Review Notes
- The post is technically valid after the fixes. The examples still assume OpenSSH is installed at `/usr/sbin/sshd`, which is correct for common Linux distributions but may need adjustment on nonstandard systems.
- `copy` works for writing `authorized_keys`, but Ansible's `authorized_key` module would be a cleaner future improvement because it is purpose-built for managing SSH authorized keys without replacing unrelated keys.
- The tutorial does not cover `Match` blocks or included `sshd_config.d` files. Those can affect advanced OpenSSH configurations and would be worth mentioning in a future hardening-focused revision.
