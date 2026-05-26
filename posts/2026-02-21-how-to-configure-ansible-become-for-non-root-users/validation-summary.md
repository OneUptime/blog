# Validation Summary: How to Configure Ansible become for Non-Root Users

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation (`become`)
- Ansible sudo and su become methods
- Ansible inventory variables
- ansible.posix.synchronize
- community.postgresql modules
- Linux sudoers configuration
- PostgreSQL administration

## Sources Consulted
- Ansible privilege escalation guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible sudo become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- ansible.posix.synchronize module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- community.postgresql.postgresql_db module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- community.postgresql.postgresql_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- community.postgresql.postgresql_privs module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_privs_module.html

## Issues Found
- The post described `su` as typically going through root first and then to the target user. Ansible's privilege escalation documentation says methods cannot be chained, and users must either have sudo permission to run as the target user or be able to su directly to the target user. Updated the explanation to describe direct `su` behavior.
- The play-level become section said environment variables reflect the target user's environment. With Ansible's default sudo flags, HOME is set for the become user, but a full login environment is not loaded unless requested with become flags. Updated the sentence to avoid overstating the environment behavior.
- The web content example used `ansible.builtin.synchronize`, but current Ansible documentation places the synchronize module in the `ansible.posix` collection as `ansible.posix.synchronize`. Updated the FQCN.

## Review Notes
The PostgreSQL examples align with the community.postgresql modules and their recommendation to use `become_user: postgres` to avoid peer authentication issues. The sudoers examples grant broad command execution as specific target users, which matches Ansible's documented limitation that privilege escalation cannot practically be limited to fixed command paths because modules execute from temporary paths.
