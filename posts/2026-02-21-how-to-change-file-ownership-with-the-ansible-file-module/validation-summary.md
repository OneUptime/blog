# Validation Summary: How to Change File Ownership with the Ansible file Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.file
- ansible.builtin.user
- ansible.builtin.group
- ansible.builtin.stat
- ansible.builtin.unarchive
- Linux file ownership and permissions

## Sources Consulted
- Ansible ansible.builtin.file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible ansible.builtin.group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- Ansible ansible.builtin.stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible ansible.builtin.unarchive module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/unarchive_module.html

## Issues Found
- The symlink section incorrectly stated that Ansible changes the ownership of the symlink itself rather than the target. Current `ansible.builtin.file` behavior follows filesystem links by default. Updated the text and example to use `follow: false` when changing the symlink object itself.
- The user/group creation section said users and groups need to exist before changing ownership. This is accurate for named users and groups but not always for numeric UID/GID ownership. Updated the wording to specify named users and groups.

## Review Notes
The rest of the examples use current Ansible FQCN module names and documented parameters. The `file` module examples assume the referenced files already exist unless `state: directory`, `state: touch`, or another creating module is used, which matches Ansible's documented behavior.
