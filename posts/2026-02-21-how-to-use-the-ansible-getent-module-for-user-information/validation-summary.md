# Validation Summary: How to Use the Ansible getent Module for User Information

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.getent module
- ansible.posix.authorized_key module
- Linux NSS databases
- Linux passwd, group, shadow, hosts, and services databases
- YAML playbooks and Jinja2 expressions

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.getent module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/getent_module.html
- Ansible Community Documentation: ansible.posix.authorized_key module - https://docs.ansible.com/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Linux manual page: getent(1) - https://man7.org/linux/man-pages/man1/getent.1.html
- Linux manual page: passwd(5) - https://man7.org/linux/man-pages/man5/passwd.5.html
- Linux manual page: group(5) - https://man7.org/linux/man-pages/man5/group.5.html
- Linux manual page: shadow(5) - https://man7.org/linux/man-pages/man5/shadow.5.html

## Issues Found
- The missing-user example used `failed_when: false` and then checked `user_check is failed`. Because `failed_when: false` suppresses the failed status, the follow-up failure condition would not work as described. Changed the example and best practice to use the module's documented `fail_key: false` parameter and test whether the username exists in `getent_passwd`.
- UID filters compared string values with `selectattr('value.1', 'ge', '1000')`. The post correctly notes that UID fields are strings, but those examples still performed string comparisons. Changed the affected examples to use `item.value[1] | int >= 1000`.

## Review Notes
- The `ansible.posix.authorized_key` example is technically valid, but the module belongs to the `ansible.posix` collection rather than `ansible-core`.
- The Ansible documentation notes that, starting with Ansible 2.11, duplicate `getent` entries may be returned differently than in older versions. The post's examples are valid for normal unique passwd and group entries.
