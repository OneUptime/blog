# Validation Summary: How to Configure become_user in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation (`become`, `become_user`, `become_method`)
- Ansible inventory variables and `ansible.cfg`
- Ansible built-in modules: `apt`, `command`, `copy`, `file`, `debug`, `service`, `user`, `git`, `pip`, `template`, `systemd`, `lineinfile`
- `community.postgresql` Ansible modules
- Linux sudoers configuration
- PostgreSQL service-account administration

## Sources Consulted
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible playbook keyword reference: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible-core/2.18/reference_appendices/config.html
- Ansible `sudo` become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `pip` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/pip_module.html
- `community.postgresql.postgresql_user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- sudoers manual: https://www.sudo.ws/docs/man/1.7.10/sudoers.man/

## Issues Found
- The post said Ansible translates `become_user` into a sudo command. This was too broad because Ansible supports multiple privilege escalation methods. Updated the wording to specify that this applies with the default `sudo` become method.
- The basic example used `initdb -D /var/lib/postgresql/data` immediately after installing PostgreSQL with `apt`. That is not a portable or reliably idempotent demonstration on Debian-family systems. Replaced it with `whoami` to demonstrate running a task as `postgres`.
- The PostgreSQL user example used `db` and `priv` with `community.postgresql.postgresql_user`. Current documentation uses `login_db`, and `priv` is not a current parameter for that module. Updated the example to use `login_db` and removed `priv`.

## Review Notes
The post is technically relevant and accurate after the edits. Future improvements could mention that `community.postgresql` is a separate collection, not part of `ansible-core`, and that file-transfer modules can have extra considerations when becoming an unprivileged user.
