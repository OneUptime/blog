# Validation Summary: How to Create Ansible Roles for Database Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles and playbooks
- Ansible built-in modules for apt, repository, template, file, systemd, cron, and task inclusion
- Ansible community.postgresql modules
- PostgreSQL 16
- PostgreSQL configuration, authentication, roles, databases, and backups
- Debian/Ubuntu PGDG Apt repository setup
- Bash backup scripting with pg_dumpall

## Sources Consulted
- Ansible CLI documentation for `ansible-galaxy role init`: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Ansible `ansible.builtin.apt_key` documentation and deprecation notes: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `ansible.builtin.apt_repository` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_repository_module.html
- Ansible `ansible.builtin.get_url` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/get_url_module.html
- PostgreSQL PGDG Apt repository instructions: https://wiki.postgresql.org/wiki/Apt
- PostgreSQL Ubuntu download and Apt repository instructions: https://www.postgresql.org/download/linux/ubuntu/
- Ansible `community.postgresql.postgresql_db` documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- Ansible `community.postgresql.postgresql_user` documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- Ansible `community.postgresql.postgresql_privs` documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_privs_module.html
- PostgreSQL 16 `CREATE DATABASE` documentation: https://www.postgresql.org/docs/16/sql-createdatabase.html
- PostgreSQL 16 `pg_hba.conf` documentation: https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- PostgreSQL 16 logging configuration documentation: https://www.postgresql.org/docs/16/runtime-config-logging.html
- PostgreSQL `pg_dumpall` documentation: https://www.postgresql.org/docs/16/app-pg-dumpall.html

## Issues Found
- The role included database creation before user management. The example sets database owners such as `app_user`, so creating databases first would fail when the owner role did not already exist. I reordered `tasks/main.yml` so users are created before databases.
- The install tasks used `ansible.builtin.apt_key`, which relies on the deprecated `apt-key` mechanism. I replaced it with a key file under `/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc` and a PGDG repository entry using `signed-by`, matching current PostgreSQL Apt repository guidance.
- The database task set `lc_collate` and `lc_ctype` but did not set `template`. The `community.postgresql.postgresql_db` module and PostgreSQL `CREATE DATABASE` documentation require matching the template database locale unless `template0` is used. I added `template: "{{ item.template | default('template0') }}"`.

## Review Notes
- The snippets assume Debian/Ubuntu hosts using the PGDG Apt repository and Debian-style PostgreSQL paths such as `/etc/postgresql/{{ pg_version }}/main`.
- The `community.postgresql` modules require the `community.postgresql` collection and a supported PostgreSQL Python driver on the target host; the role installs `python3-psycopg2`.
- The `scram-sha-256` `pg_hba.conf` examples are correct for PostgreSQL 16, where SCRAM password encryption is the normal modern choice.
