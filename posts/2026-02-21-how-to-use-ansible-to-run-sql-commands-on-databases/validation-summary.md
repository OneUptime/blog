# Validation Summary: How to Use Ansible to Run SQL Commands on Databases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible `ansible.builtin.command` and `ansible.builtin.shell`
- Ansible `community.postgresql` collection
- Ansible `community.mysql` collection
- PostgreSQL, `psql`, `pg_dump`, and `pg_restore`
- MySQL command-line client
- SQL migration, backup, restore, and maintenance workflows

## Sources Consulted
- Ansible `community.postgresql.postgresql_query` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- Ansible `community.postgresql.postgresql_db` module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- Ansible `community.mysql.mysql_query` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_query_module.html
- Ansible `community.mysql.mysql_db` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_db_module.html
- Ansible playbook error handling and `changed_when` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible loop/register behavior documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- PostgreSQL `psql` documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/17/app-pgdump.html
- PostgreSQL system administration functions documentation: https://www.postgresql.org/docs/17/functions-admin.html
- PostgreSQL string function documentation for `format('%I', ...)`: https://www.postgresql.org/docs/18/functions-string.html

## Issues Found
- The post said Ansible "ships with" the database modules and implied all dedicated modules handle idempotency. Updated this to clarify that the examples use community collections, which are not part of `ansible-core`, and that arbitrary query modules provide connection handling and structured results while query idempotency depends on the SQL being run.
- The MySQL query example passed a password but did not suppress task output. Added `no_log: true`.
- The PostgreSQL raw SQL examples checked `stderr` for `CREATE` and `ALTER` command tags. `psql` writes normal command output to `stdout`, so the examples now check `stdout`.
- The MySQL here-document example checked for `Query OK` in `stdout`, which the noninteractive `mysql` client does not reliably emit for that invocation. Changed the condition to mark the task changed when the command succeeds.
- The migration loop used `item.stdout` in `changed_when`, but `item` is the looped migration file object, not the command result. Updated it to check the registered result for the current iteration.
- The PostgreSQL custom-format backup used a `.sql.gz` filename even though `pg_dump -Fc` writes a custom-format archive that is already compressed by default and restored with `pg_restore`. Renamed the example output to `.dump`.
- The schema-only backup used `ansible.builtin.command` with `$(date ...)`, which would not be expanded because `command` does not run through a shell. Changed that task to `ansible.builtin.shell`.
- The table-size query passed concatenated text to `pg_total_relation_size` and `pg_relation_size`, whose documented argument is `regclass`. Updated the query to build a safely quoted relation name with `format('%I.%I', ...)::regclass`.
- The table-size query used `table` as an output alias. Renamed it to `table_name` to avoid ambiguity with the SQL keyword.

## Review Notes
The examples are technically valid after correction. Future improvements could add installation notes for `community.postgresql`, `community.mysql`, `psycopg`/`psycopg2`, and `PyMySQL`, but those are prerequisites rather than errors in the current examples.
