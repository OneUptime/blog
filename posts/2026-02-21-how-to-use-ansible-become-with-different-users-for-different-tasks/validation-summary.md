# Validation Summary: How to Use Ansible become with Different Users for Different Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation with `become` and `become_user`
- Ansible playbooks, tasks, handlers, blocks, and roles
- Ansible built-in modules: `apt`, `git`, `pip`, `template`, `copy`, `file`, `user`, `command`, `service`, `systemd`, `debug`
- `community.postgresql` modules: `postgresql_db`, `postgresql_user`, `postgresql_privs`
- PostgreSQL SQL and privilege management
- Linux sudoers configuration and `visudo` validation

## Sources Consulted
- Ansible privilege escalation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible blocks documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `community.postgresql.postgresql_db` module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- Ansible `community.postgresql.postgresql_user` module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- Ansible `community.postgresql.postgresql_privs` module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_privs_module.html
- Ansible inventory connection variable documentation: https://docs.ansible.com/ansible/latest/inventory_guide/connection_details.html
- PostgreSQL `CREATE DATABASE` documentation: https://www.postgresql.org/docs/current/sql-createdatabase.html
- Debian sudoers manual page: https://manpages.debian.org/testing/sudo/sudoers.5.en.html

## Issues Found
- The `postgresql_user` examples used the deprecated `db` alias and the removed `priv` parameter. I changed them to use `login_db` for connection/database context and added separate `community.postgresql.postgresql_privs` tasks for grants, matching the current `community.postgresql` module documentation.
- One `postgresql_privs` example used the deprecated `database` alias. I changed it to `login_db`.
- The variable-driven SQL example used `CREATE DATABASE IF NOT EXISTS`, which PostgreSQL does not support. I replaced the raw SQL command loop with idempotent `community.postgresql.postgresql_db` and `community.postgresql.postgresql_privs` tasks.
- The sudoers setup example used `ansible_ssh_user`, an older connection variable name. I changed the example to use a neutral `sudo_user` variable for templating the sudoers file.
- The home-directory explanation stated that `HOME` always changes when using `become`. I softened the wording because environment behavior depends on the become method and sudo configuration.

## Review Notes
The examples assume the `community.postgresql` collection and required Python PostgreSQL adapter are available on the managed host. The PostgreSQL examples correctly use `become_user: postgres`, which is consistent with the collection documentation for avoiding peer-authentication failures on typical local PostgreSQL installations.
