# Validation Summary: How to Use Ansible to Manage PostgreSQL Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.postgresql Ansible collection
- PostgreSQL privileges and roles
- PostgreSQL schemas, tables, sequences, and default privileges
- YAML playbooks and roles

## Sources Consulted
- Ansible community.postgresql.postgresql_privs module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_privs_module.html
- Ansible community.postgresql.postgresql_query module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- PostgreSQL GRANT command documentation: https://www.postgresql.org/docs/15/sql-grant.html
- PostgreSQL privileges documentation: https://www.postgresql.org/docs/17/ddl-priv.html
- PostgreSQL schemas and privileges documentation: https://www.postgresql.org/docs/16/ddl-schemas.html

## Issues Found
- The examples used the deprecated `database` alias for `community.postgresql.postgresql_privs`. Updated those module calls to the current `login_db` parameter documented by Ansible.
- The audit example used the deprecated `db` alias for `community.postgresql.postgresql_query`. Updated it to `login_db`.
- The schema-permissions explanation said schema privileges control who can "see" objects. PostgreSQL documents schema `USAGE` as allowing access/use of objects in the schema, with object-level privileges still required. Updated the wording to "use and create objects".
- The sequence-permissions comment said sequence grants make INSERT with `serial/identity` columns work. PostgreSQL's GRANT documentation explicitly calls out sequences tied to `SERIAL` columns and sequence defaults, so the comment was narrowed to `serial` columns or explicit sequence defaults.

## Review Notes
- The examples rely on the `community.postgresql` collection and a PostgreSQL Python adapter on the managed host, which is consistent with Ansible's module requirements.
- `TEMP` is a valid alternative spelling for PostgreSQL's `TEMPORARY` database privilege.
- `ALL_IN_SCHEMA`, `target_roles`, `type: default_privs`, and `query_result` usage match the current Ansible community.postgresql documentation.
