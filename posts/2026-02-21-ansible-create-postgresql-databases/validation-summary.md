# Validation Summary: How to Use Ansible to Create PostgreSQL Databases

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Galaxy
- community.postgresql Ansible collection
- PostgreSQL database management
- PostgreSQL extensions
- YAML
- SQL

## Sources Consulted
- Ansible community.postgresql collection index: https://docs.ansible.com/ansible/latest/collections/community/postgresql/index.html
- Ansible community.postgresql.postgresql_db module: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- Ansible community.postgresql.postgresql_ext module: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_ext_module.html
- Ansible community.postgresql.postgresql_query module: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- Ansible community.postgresql.postgresql_script module: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_script_module.html
- Ansible community.postgresql.postgresql_info module: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_info_module.html
- Ansible community.postgresql.postgresql_set module: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_set_module.html
- Ansible collections installation guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- PostgreSQL CREATE DATABASE documentation: https://www.postgresql.org/docs/current/sql-createdatabase.html
- PostgreSQL ALTER DATABASE documentation: https://www.postgresql.org/docs/current/sql-alterdatabase.html
- PostgreSQL ALTER SYSTEM documentation: https://www.postgresql.org/docs/current/sql-altersystem.html
- PostgreSQL uuid-ossp extension documentation: https://www.postgresql.org/docs/current/uuid-ossp.html
- PostgreSQL pgcrypto extension documentation: https://www.postgresql.org/docs/current/pgcrypto.html

## Issues Found
- The prerequisites said only `psycopg2` was required. Current community.postgresql documentation describes the modules as using the psycopg adapter and supporting either `psycopg2 >= 2.5.1` or `psycopg3 >= 3.1.8`, so the text now says a supported PostgreSQL Python adapter such as `psycopg2` or `psycopg` is required.
- The extension examples used the deprecated `db` alias for `community.postgresql.postgresql_ext`. Updated those snippets to use `login_db`.
- The database-level settings example used `community.postgresql.postgresql_set`, but that module uses `ALTER SYSTEM`, changes cluster-wide configuration, and is deprecated for future community.postgresql 5.0.0 removal. Replaced it with `community.postgresql.postgresql_query` running `ALTER DATABASE ... SET ...`, which matches the per-database explanation.
- The schema application example used `path_to_script` with `community.postgresql.postgresql_query`, but current documentation directs SQL-file execution to `community.postgresql.postgresql_script` with the `path` parameter. Updated the snippet accordingly.
- The `postgresql_query` schema check used the deprecated `db` alias. Updated it to `login_db`.

## Review Notes
The remaining examples are technically sound for current community.postgresql documentation. The sample schema uses `gen_random_uuid()`, so deployments on older PostgreSQL versions should ensure `pgcrypto` is installed before applying the schema; the post already installs `pgcrypto` in the shown database definitions.
