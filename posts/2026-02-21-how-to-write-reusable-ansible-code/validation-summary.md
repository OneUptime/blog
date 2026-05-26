# Validation Summary: How to Write Reusable Ansible Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible task includes
- Ansible modules: user, group, git, pip, apt, apt_repository, dnf, uri, copy, template
- Ansible custom filter plugins
- Ansible role dependencies
- Ansible collections and galaxy.yml metadata
- ansible-galaxy collection build/install commands
- YAML configuration

## Sources Consulted
- Ansible include_tasks module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible user module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible group module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/group_module.html
- Ansible privilege escalation documentation: https://docs.ansible.com/ansible/latest/user_guide/become.html
- Ansible git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible dnf module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible filter plugin documentation: https://docs.ansible.com/ansible/latest/plugins/filter.html
- Ansible role dependency documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible collection metadata documentation: https://docs.ansible.com/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible collection structure documentation: https://docs.ansible.com/ansible/latest/dev_guide/developing_collections_structure.html
- Ansible collection usage documentation: https://docs.ansible.com/ansible/latest/collections_guide/collections_using_playbooks.html

## Issues Found
- The app deployment role set `group: "{{ app_deploy_group }}"` on the user without first ensuring that group exists. Added an `ansible.builtin.group` task before the user task because the user module's `group` option sets an existing primary group.
- The git checkout and pip install tasks used `become_user` without `become: yes`. Added `become: yes` to both tasks because Ansible documentation states that setting `become_user` does not enable privilege escalation by itself.
- The Debian task file enabled an Ubuntu PPA after installing nginx and described it as Debian/Ubuntu-wide. Moved the repository task before package installation, constrained it to Ubuntu, and set the install state to `latest` when `webserver_use_latest` is enabled.
- The RHEL/CentOS example used a raw `dnf module enable nginx:1.24 -y` command, which is not idempotent as written. Replaced it with the `ansible.builtin.dnf` module using a modular package spec when `webserver_use_latest` is enabled.

## Review Notes
Local `ansible-doc` and `ansible-galaxy` commands were unavailable in the review environment, so validation was performed against official Ansible documentation. The examples are suitable as illustrative snippets, but a production role should also validate required variables such as `app_deploy_repo` and account for distribution-specific nginx repository availability.
