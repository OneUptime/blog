# Validation Summary: How to Copy Files with Backup Using Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.copy
- ansible.builtin.template
- ansible.builtin.lineinfile
- ansible.builtin.blockinfile
- ansible.builtin.find
- ansible.builtin.file
- ansible.builtin.systemd
- Jinja2 filters in Ansible playbooks

## Sources Consulted
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible blockinfile module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/blockinfile_module.html
- Ansible find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible common return values documentation: https://docs.ansible.com/projects/ansible/13/reference_appendices/common_return_values.html
- Ansible playbook filters documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html

## Issues Found
- The cleanup example used `groupby('path | regex_replace(...)')`, which is not a valid way to group by a filtered expression in Ansible/Jinja. Replaced it with a valid `sort(attribute='mtime', reverse=true)` cleanup task that removes backup files beyond the three most recent matches.
- The Nginx rollback failure message claimed rollback always occurred. Updated the message to say rollback happened only when a previous backup was available.
- The complete workflow could restart the application after `app_check` failed if no `backup_file` existed. Added an explicit failure task for the no-backup failure case and made the restart conditional on `app_check.rc == 0`.

## Review Notes
- The Ansible CLI is not installed in the local environment, so validation was performed against the current official Ansible documentation rather than `ansible-doc` output.
- `ansible.builtin.systemd` is currently a compatibility alias/redirect to `ansible.builtin.systemd_service`; the examples remain functional, but future posts may prefer the newer FQCN.
