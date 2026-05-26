# Validation Summary: How to Set User Home Directory with the Ansible user Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.user module
- ansible.builtin.file module
- ansible.builtin.copy module
- ansible.builtin.getent module
- ansible.posix.mount module
- Linux user accounts and home directories
- NFS mounts

## Sources Consulted
- Ansible official documentation: ansible.builtin.user module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible official documentation: ansible.builtin.getent module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/getent_module.html
- Ansible official documentation: ansible.posix.mount module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible official source: ansible.builtin.user module implementation - https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/modules/user.py
- Linux nfs(5) manual page - https://man7.org/linux/man-pages/man5/nfs.5.html

## Issues Found
- The default home directory section stated that Ansible always creates `/home/alice`. Changed this to "on a typical Linux system" because the Ansible module delegates default shell and account behavior to platform user-management tools, and the default home path can vary by system configuration.
- The custom home directory section said the parent directory must already exist. Updated this because Ansible's current `user` module implementation can create a missing home path when `create_home` is enabled, while parent directory permissions should still be managed explicitly when needed.
- The workflow diagram implied that existing home directories are chowned by Ansible. Updated it to show ownership changes on newly created home directories only, since existing directories are left alone unless managed by separate tasks.
- The `move_home` section said that without `move_home: yes`, the new directory is created empty. Updated this because Ansible may create the new home directory when `create_home` remains enabled, but it does not move old files; the new directory may be populated from skeleton files.
- The custom skeleton section did not explicitly mention the documented requirement that `skeleton` requires `create_home`. Added that caveat.
- The NFS mount example used the deprecated `intr` mount option. Removed `intr` and left `rw,hard`, matching current NFS guidance and Ansible's own NFS examples.

## Review Notes
The playbook snippets are syntactically valid for Ansible playbooks and use current FQCN module names. The `getent_passwd` example relies on Ansible fact injection being enabled; using `ansible_facts.getent_passwd` would be more explicit in future revisions, but the current example is still valid under Ansible's default fact behavior.
