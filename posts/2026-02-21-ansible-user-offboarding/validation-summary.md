# Validation Summary: How to Use Ansible to Automate User Offboarding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules for Linux user, file, command, copy, stat, cron, setup, package, service, URI, and line editing tasks
- community.general Ansible collection
- community.postgresql Ansible collection
- Linux account management commands
- PostgreSQL role and session management
- SSH, sudoers, cron, and shell account controls

## Sources Consulted
- Ansible community.general.archive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/archive_module.html
- Ansible ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible ansible.builtin.quote filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/quote_filter.html
- Ansible community.postgresql.postgresql_query module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- Ansible community.postgresql.postgresql_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- PostgreSQL pg_stat_activity documentation: https://www.postgresql.org/docs/current/static/monitoring-stats.html
- PostgreSQL system administration function documentation for pg_terminate_backend: https://www.postgresql.org/docs/current/functions-admin.html
- Local command help for passwd, crontab, and pkill.

## Issues Found
- The home directory archive task used the short module name `archive`, but current Ansible documentation identifies this as `community.general.archive`, which is not part of ansible-core. Updated the example to use the fully qualified collection name.
- The session termination shell task templated usernames without shell quoting. Added the Ansible `quote` filter so usernames are passed safely to `pkill`.
- The account locking and expiry tasks used raw `usermod` and `chage` commands with forced changed status. Updated them to use the current `ansible.builtin.user` module options `password_lock: true` and `expires: 0`, which are idempotent and documented for account management.
- The PostgreSQL query interpolated usernames directly into SQL. Updated it to use `community.postgresql.postgresql_query` with `positional_args`, matching the module documentation and avoiding unsafe SQL construction.
- The PostgreSQL modules were shown with short names. Updated them to the documented fully qualified names from the `community.postgresql` collection.
- The database task claimed to revoke all privileges, but `community.postgresql.postgresql_user state: absent` cannot remove a role while it still has privileges in any database. Updated the example to disable login with `role_attr_flags: NOLOGIN`, then attempt role removal with `fail_on_user: false` when no object privileges remain.

## Review Notes
The remaining examples are syntactically valid YAML and use documented Ansible modules and CLI options. The database offboarding example is intentionally conservative; full cleanup of PostgreSQL object ownership and privileges may require environment-specific `community.postgresql.postgresql_privs`, ownership reassignment, or `DROP OWNED`/`REASSIGN OWNED` handling across databases.
