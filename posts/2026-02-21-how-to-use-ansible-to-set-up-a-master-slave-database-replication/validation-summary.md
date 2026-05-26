# Validation Summary: How to Use Ansible to Set Up a Master-Slave Database Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- PostgreSQL 15
- PostgreSQL streaming replication
- PostgreSQL physical replication slots
- PostgreSQL WAL archiving
- Jinja2 templates
- YAML inventory and playbooks

## Sources Consulted
- PostgreSQL 15 `pg_basebackup` documentation: https://www.postgresql.org/docs/15/app-pgbasebackup.html
- PostgreSQL 15 streaming replication documentation: https://www.postgresql.org/docs/15/warm-standby.html
- PostgreSQL 15 WAL configuration documentation: https://www.postgresql.org/docs/15/runtime-config-wal.html
- PostgreSQL 15 `pg_hba.conf` documentation: https://www.postgresql.org/docs/15/auth-pg-hba-conf.html
- Ansible `community.postgresql.postgresql_slot` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_slot_module.html
- Ansible `community.postgresql.postgresql_user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.import_playbook` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html

## Issues Found
- The description claimed "automated failover monitoring," but the post only verifies replication status and does not configure automated failover. Changed the description to "replication verification."
- The primary configuration enabled WAL archiving but did not create the archive directory. Added a `postgresql_archive_dir` variable and an Ansible `file` task to create it with PostgreSQL ownership.
- The `archive_command` used plain `cp`, which can overwrite an existing archived WAL file while still returning success. Changed it to test that the destination file does not already exist before copying, matching PostgreSQL's requirement that archive commands report success only when archiving succeeds safely.
- The replica role referenced `postgresql-replica.conf.j2` but did not show the template. Added the missing replica template with valid PostgreSQL settings, including `hot_standby = on`.

## Review Notes
The examples are version-specific to PostgreSQL 15 and Debian/Ubuntu-style PostgreSQL paths. The replica initialization task intentionally removes the existing data directory, so the replica role is not idempotent in the same way as the primary role.
