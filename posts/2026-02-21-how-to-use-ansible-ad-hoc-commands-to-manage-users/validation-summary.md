# Validation Summary: How to Use Ansible Ad Hoc Commands to Manage Users

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible ad hoc commands
- ansible.builtin.user
- ansible.builtin.group
- ansible.posix.authorized_key
- ansible.builtin.file
- ansible.builtin.shell
- Linux user, group, SSH key, and shadow password management

## Sources Consulted
- Ansible ad hoc commands documentation: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- ansible.builtin.group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- ansible.posix.authorized_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- ansible.builtin.file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Linux shadow(5) manual page: https://man7.org/linux/man-pages/man5/shadow.5.html

## Issues Found
- Literal SHA-512 password hash examples were wrapped in double-quoted shell strings, causing `$6`, `$xyz`, and `$hashedpasswordhere` to be interpreted by the local shell before Ansible received them. Changed those examples to single-quote the whole `-a` argument so the hash is passed literally.
- The password rotation command wrapped `$NEW_HASH` in embedded single quotes inside a double-quoted shell string. Changed it to `password=$NEW_HASH` so the variable expands cleanly before being passed to Ansible.
- The offboarding example said `password_lock=yes` prevents login. Ansible documents that `password_lock` locks the password and may not block other login methods, so the comment now says SSH keys may still work until removed.
- The offboarding example used `--ignore-errors`, which is not an `ansible` ad hoc CLI option. Replaced it with `pkill -u jsmith || true` inside the shell command.
- The empty-password audit treated `!` in `/etc/shadow` as an empty password. The Linux shadow manual describes `!` as a locked password marker, so the command now checks only for an empty password field.

## Review Notes
- The `authorized_key` module is provided by the `ansible.posix` collection in current Ansible documentation. The short module name is commonly available when using the full `ansible` package, but users of minimal `ansible-core` installations may need to install `ansible.posix` or use the FQCN `ansible.posix.authorized_key`.
- Several shell examples are Linux-specific because they use commands such as `chage`, `/etc/shadow`, and GNU/Linux UID conventions.
