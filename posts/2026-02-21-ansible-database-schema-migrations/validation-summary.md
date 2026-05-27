# Validation Summary: How to Use Ansible for Database Schema Migrations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.postgresql Ansible collection
- PostgreSQL
- SQL database migrations
- Flyway
- YAML playbooks

## Sources Consulted
- Ansible community.postgresql.postgresql_query module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- Ansible community.postgresql.postgresql_db module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- Ansible community.postgresql.postgresql_ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_ping_module.html
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible regex_replace filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/regex_replace_filter.html
- Redgate Flyway command-line documentation: https://documentation.red-gate.com/flyway/reference/usage/command-line

## Issues Found
- The PostgreSQL query and ping examples used the deprecated `db` alias. Changed these to `login_db`, which is the current documented parameter name for `community.postgresql.postgresql_query` and `community.postgresql.postgresql_ping`.
- The pending migration filter rejected paths by searching for applied version strings as loose substrings. Tightened the filter so applied versions match the migration filename token followed by `__`, avoiding false skips such as treating `V0010` as already applied when `V001` is applied.
- The rollback-section stripping regex only removed the `-- ROLLBACK:` marker line because `multiline=True` does not make `.` span newlines. Changed it to use an inline DOTALL regex so the rollback section is removed from the SQL sent to PostgreSQL.
- The tracking-table insert stored `migration_result.query_all_results | length` as `execution_time_ms`, which counts query result sets rather than elapsed execution time. Changed it to use the documented `execution_time_ms` return value.
- The Flyway download URL used the older Maven Central `org/flywaydb` path. Updated it to the current Redgate-documented command-line download path.
- The rollback playbook restored from a backup path that did not match the per-migration backup task. Updated the restore target to match the generated `/tmp/pre_{{ migration_version }}_backup.sql.gz` path and removed an unused rollback variable.

## Review Notes
- The examples are suitable as tutorial snippets, but production migrations should also consider advisory locking or another single-runner mechanism, explicit transaction/autocommit behavior for statements that cannot run inside a transaction, and tested restore procedures for the specific PostgreSQL dump format in use.
