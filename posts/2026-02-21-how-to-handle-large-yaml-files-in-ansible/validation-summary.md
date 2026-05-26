# Validation Summary: How to Handle Large YAML Files in Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible playbooks
- YAML
- Ansible roles
- Ansible variable files and group_vars
- Ansible task includes
- Ansible fact caching
- community.general collection modules

## Sources Consulted
- Ansible host_group_vars vars plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_group_vars_vars.html
- Ansible include_tasks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible configuration settings for fact caching and gathering: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.builtin.hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html

## Issues Found
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current documented timezone module is `community.general.timezone`. Updated the example to use `community.general.timezone`.
- The performance section implied fact caching helps with YAML parse time. Updated the wording to clarify that fact caching does not reduce YAML parsing, but can reduce repeated fact-gathering overhead.
- Several comments and sentences referred to "this module" even though the post is about Ansible YAML organization practices, not a single module. Updated those references to describe practices or patterns.

## Review Notes
- The `community.general.timezone` and `community.general.ufw` examples require the `community.general` collection, which is included in the full Ansible package but not in `ansible-core`.
- The `group_vars/<group>/` directory pattern is valid; Ansible's default host/group vars plugin loads YAML, JSON, and extensionless variable files from these directories.
