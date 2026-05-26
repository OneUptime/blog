# Validation Summary: How to Use Ansible to Archive Files on Remote Hosts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.general.archive
- ansible.builtin.find
- ansible.builtin.file
- ansible.builtin.copy
- ansible.builtin.fetch
- ansible.builtin.unarchive
- PostgreSQL pg_dump
- Linux find

## Sources Consulted
- Ansible community.general.archive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/archive_module.html
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.fetch module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fetch_module.html
- Ansible ansible.builtin.unarchive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible delegation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html

## Issues Found
- The `exclude_path` examples used a plain directory source path while excluding child paths. The official `community.general.archive` documentation states that `exclude_path` applies to source paths and glob expansion, and recommends `exclusion_patterns` for excluding files or subdirectories below source paths. I changed the relevant source paths to globbed paths so the absolute `exclude_path` entries are applied as intended.
- The deployment example delegated `ansible.builtin.copy` to `build_server`, which would copy from the controller to the delegated host instead of distributing the package to the target hosts. I changed the workflow to create and fetch the package from `build_server` once, then copy that local package to the target hosts with `ansible.builtin.copy`.

## Review Notes
- The `community.general.archive` module is part of the `community.general` collection rather than `ansible-core`; environments using only `ansible-core` need that collection installed.
- The examples assume destination directories such as `/opt/backups`, `/opt/releases`, and `/opt/log-archive` already exist, which is consistent with the module documentation requiring the archive destination parent directory to exist.
