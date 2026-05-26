# Validation Summary: How to Create Ansible Roles for User Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles
- ansible.builtin.user
- ansible.builtin.group
- ansible.posix.authorized_key
- ansible.builtin.file
- ansible.builtin.template
- ansible.builtin.apt
- sudoers configuration
- Linux user password aging and account locking

## Sources Consulted
- Ansible user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- Ansible authorized_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/template_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Local chage and usermod help output for supported flags: `chage --help`, `usermod --help`

## Issues Found
- The SSH key task looped over individual keys while exposing `um_ssh_key_exclusive`. The official `ansible.posix.authorized_key` documentation notes that `exclusive` is not loop-aware, so multiple keys must be passed in one batch. Changed the task to loop over users and join each user's keys with newlines.
- The user task defaulted missing `groups` to an empty list and then joined it to an empty string. The Ansible user module treats an empty string as a request to remove supplementary groups. Changed the task to omit `groups` when a user does not define groups.
- The role defined `um_authorized_keys_mode` and `um_skeleton_dir` but did not use them. Added the `skeleton` parameter to user creation and a file task to enforce `authorized_keys` permissions.
- The removed-user flow deleted users and then tried to lock the same accounts with `usermod -L`, which cannot reliably work after account removal. Removed that task and used the Ansible user module's documented `password_lock` parameter for managed present users instead.
- The password-aging task used `chage` through `ansible.builtin.command` with `changed_when: false`, which applied changes but hid them from Ansible's change reporting. Replaced it with the documented `password_expire_max`, `password_expire_min`, and `password_expire_warn` user module parameters.
- The password complexity package task used the Debian/Ubuntu-specific `ansible.builtin.apt` module without an OS-family guard. Added a Debian-family condition.
- The usage example placed `jsmith` in the `docker` group without creating that group in `um_groups`. Added `docker` to the managed group list.

## Review Notes
- `ansible.posix.authorized_key` belongs to the `ansible.posix` collection, which may need to be installed separately when using ansible-core rather than the full Ansible package.
- The password expiration parameters are Linux-focused, and `password_expire_warn` requires ansible-core 2.16 or newer.
