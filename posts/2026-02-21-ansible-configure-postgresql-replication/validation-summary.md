# Validation Summary: How to Use Ansible to Configure PostgreSQL Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- PostgreSQL 16
- PostgreSQL streaming replication
- PostgreSQL physical replication slots
- PostgreSQL WAL archiving
- pg_basebackup
- community.postgresql Ansible collection

## Sources Consulted
- PostgreSQL 16 documentation: Log-Shipping Standby Servers - https://www.postgresql.org/docs/16/warm-standby.html
- PostgreSQL 16 documentation: Replication runtime configuration - https://www.postgresql.org/docs/16/runtime-config-replication.html
- PostgreSQL 16 documentation: pg_basebackup - https://www.postgresql.org/docs/16/app-pgbasebackup.html
- PostgreSQL 16 documentation: Continuous Archiving and Point-in-Time Recovery - https://www.postgresql.org/docs/16/continuous-archiving.html
- Ansible community.postgresql collection index - https://docs.ansible.com/ansible/latest/collections/community/postgresql/index.html
- Ansible community.postgresql.postgresql_user module - https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- Ansible community.postgresql.postgresql_slot module - https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_slot_module.html
- Ansible community.postgresql.postgresql_query module - https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html

## Issues Found
- The `archive_command` example used plain `cp %p /var/lib/postgresql/wal_archive/%f`. PostgreSQL's documentation recommends archive commands refuse to overwrite pre-existing archive files, because PostgreSQL treats a zero exit status as successful archival. I changed it to `test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f`, matching the documented safe pattern.

## Review Notes
- The `pg_basebackup -R` option already creates `standby.signal` and writes connection settings to `postgresql.auto.conf`; the later Ansible tasks are redundant but not technically incorrect.
- The tutorial assumes Debian/Ubuntu PostgreSQL paths such as `/etc/postgresql/{{ postgresql_version }}/main` and `/var/lib/postgresql/{{ postgresql_version }}/main`.
- Local `ansible-playbook`, `ansible-doc`, and PostgreSQL CLI binaries were not installed in the review workspace, so command and module checks were performed against official documentation.
