# Validation Summary: How to Use Ansible to Restore Databases from Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- AWS CLI S3 commands
- PostgreSQL and pg_restore
- MySQL / MariaDB restore workflows
- MongoDB and mongorestore
- Ansible Vault-style secret variables

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.unarchive` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/unarchive_module.html
- Ansible `community.postgresql.postgresql_query` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- Ansible `ansible.mysql.mysql_db` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_db_module.html
- Ansible `community.mysql.mysql_query` module documentation, including collection rename notice: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_query_module.html
- AWS CLI `aws s3 ls` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html
- AWS CLI S3 commands guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html
- PostgreSQL `pg_restore` documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL `ANALYZE` documentation: https://www.postgresql.org/docs/current/sql-analyze.html
- MySQL `OPTIMIZE TABLE` documentation: https://dev.mysql.com/doc/refman/8.4/en/optimize-table.html
- MongoDB `mongorestore` documentation: https://www.mongodb.com/docs/manual/reference/mongorestore

## Issues Found
- The MySQL examples used `community.mysql` FQCNs. Current Ansible documentation says the collection has been renamed to `ansible.mysql` and should be used for new playbooks, so the MySQL module references were updated to `ansible.mysql`.
- The MySQL restore used a shell pipeline for a gzipped dump. Replaced it with `ansible.mysql.mysql_db` using `state: import` and `target`, matching the module's documented import workflow and avoiding shell pipeline failure handling issues.
- The task named "Run OPTIMIZE TABLE on large tables" only selected generated SQL and never executed it. Split it into a discovery task and an execution task that loops over the returned commands.
- The generated `OPTIMIZE TABLE` statements did not quote identifiers. Updated the generated SQL to quote and escape schema and table names.
- The MongoDB restore used `{{ restore_dir }}/full_*` with `ansible.builtin.command`. The command module does not process shell globbing, so the wildcard would be passed literally. Added an Ansible `find` task to locate matching extracted dump directories and changed `mongorestore` to use `argv` with each discovered path.

## Review Notes
The PostgreSQL `pg_restore` options, `ANALYZE` guidance, S3 command forms, Ansible `stat`/`fail` checks, PostgreSQL query parameter usage, and MongoDB `mongorestore --gzip --drop` options were consistent with official documentation. The restore examples still assume the required database client tools, Python database drivers, Ansible collections, and cloud/database credentials are already installed and configured on the target host.
