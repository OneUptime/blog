# Validation Summary: How to Split Large Ansible Playbooks into Multiple Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible imports and includes
- Ansible roles
- Ansible inventory variables and group_vars
- Ansible built-in modules
- community.general Ansible collection
- YAML
- Cron

## Sources Consulted
- Ansible Core documentation: Reusing Ansible artifacts - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_reuse.html
- Ansible documentation: Including and Importing - https://docs.ansible.com/projects/ansible/2.9/user_guide/playbooks_reuse_includes.html
- Ansible built-in collection index - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- ansible.builtin.import_playbook module documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- ansible.builtin.hostname module documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.uri module documentation - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.cron module documentation - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- ansible.builtin.host_group_vars vars plugin documentation - https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/host_group_vars_vars.html
- community.general.timezone module documentation - https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The infrastructure workflow used `ansible.builtin.timezone`, but the current module is `community.general.timezone`; the latest Ansible built-in collection index does not include a built-in timezone module. Updated the example to use `community.general.timezone`.
- The error-handling example registered `fallback_result` but allowed the fallback command to fail immediately, which would prevent the subsequent reporting and final failure tasks from running. Added `failed_when: false` to the fallback task so the explicit failure logic can evaluate both paths.
- Several generated references to "this module" were inaccurate because the post covers a playbook organization approach, not a single Ansible module. Updated those phrases to "this approach."

## Review Notes
Ansible is not installed in this workspace, so local `ansible-playbook --syntax-check` and `ansible-doc` verification could not be run. The review was completed against official Ansible documentation. The examples use modules from both `ansible-core` and `community.general`; environments with only `ansible-core` need the `community.general` collection installed for `community.general.ufw` and `community.general.timezone`.
