# Validation Summary: How to Use the community.postgresql Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.postgresql Ansible collection
- PostgreSQL
- Psycopg / psycopg2 / psycopg3
- YAML playbooks
- pg_hba.conf

## Sources Consulted
- Ansible community.postgresql collection index: https://docs.ansible.com/ansible/latest/collections/community/postgresql/index.html
- community.postgresql.postgresql_db module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- community.postgresql.postgresql_user module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- community.postgresql.postgresql_privs module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_privs_module.html
- community.postgresql.postgresql_query module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- community.postgresql.postgresql_script module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_script_module.html
- community.postgresql.postgresql_schema module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_schema_module.html
- community.postgresql.postgresql_ext module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_ext_module.html
- community.postgresql.postgresql_alter_system module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_alter_system_module.html
- community.postgresql.postgresql_pg_hba module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_pg_hba_module.html
- PostgreSQL ALTER SYSTEM documentation: https://www.postgresql.org/docs/current/sql-altersystem.html
- PostgreSQL pg_hba.conf documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html

## Issues Found
- The collection version requirement was too low for the current non-deprecated configuration module. Changed `>=3.2.0` to `>=3.13.0` because `community.postgresql.postgresql_alter_system` was introduced in community.postgresql 3.13.0.
- Several examples used deprecated `db` or `database` aliases where current documentation recommends `login_db`. Updated the `postgresql_privs`, `postgresql_query`, `postgresql_schema`, and `postgresql_ext` examples to use `login_db`.
- The migration script task used `community.postgresql.postgresql_query` with unsupported `path_to_script` and `as_single_query` parameters. Changed it to `community.postgresql.postgresql_script` with the documented `path` parameter.
- The PostgreSQL configuration section used `community.postgresql.postgresql_set`, which is deprecated and scheduled for removal in community.postgresql 5.0.0. Replaced it with `community.postgresql.postgresql_alter_system` and changed `name` to the documented `param` parameter.
- The module overview diagram listed `postgresql_set`; updated it to `postgresql_alter_system`.

## Review Notes
- The PostgreSQL tuning values are syntactically valid examples, but production values should be selected based on workload, memory, PostgreSQL version, and instance size.
- The `postgresql_alter_system` module supports PostgreSQL 14 or later. The article already uses a PostgreSQL 16 pg_hba path, so this is consistent with the examples.
- Some PostgreSQL extensions such as PostGIS require server-side OS packages to be installed before `postgresql_ext` can create them in a database.
