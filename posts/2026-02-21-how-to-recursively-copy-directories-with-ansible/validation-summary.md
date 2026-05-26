# Validation Summary: How to Recursively Copy Directories with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.copy
- ansible.posix.synchronize
- ansible.builtin.find
- ansible.builtin.file
- community.general.archive
- ansible.builtin.unarchive
- rsync

## Sources Consulted
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.posix.synchronize` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `community.general.archive` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/archive_module.html
- Ansible `ansible.builtin.unarchive` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible `ansible.builtin.relpath` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/relpath_filter.html

## Issues Found
- The post used `ansible.builtin.archive`, but the current documented archive module is `community.general.archive`. Updated the archive example to use `community.general.archive`.
- The archive/unarchive example extracted into `/opt/myapp/` without ensuring the destination directory exists. The `unarchive` module requires `dest` to already exist, so a `file` task was added before extraction.
- The post recommended switching away from `copy` at about 50 files. Official Ansible documentation states that recursive copy does not scale to lots of files, specifically more than hundreds, so the threshold wording and performance table were adjusted to avoid presenting 50 as a documented cutoff.

## Review Notes
The remaining examples use valid current module names and parameters. The `ansible.posix.synchronize` and `community.general.archive` examples depend on collections that are commonly included with the full Ansible package but are not part of `ansible-core`.
