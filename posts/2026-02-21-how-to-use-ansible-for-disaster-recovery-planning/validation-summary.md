# Validation Summary: How to Use Ansible for Disaster Recovery Planning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, task includes, and playbook imports
- Ansible built-in modules: file, include_tasks, find, stat, assert, command, shell, fail, debug, lineinfile, service, uri, add_host, wait_for, apt, template
- Ansible amazon.aws collection modules: s3_object and ec2_instance
- PostgreSQL backup, restore, readiness, and recovery commands: pg_dump, pg_restore, createdb, psql, pg_isready, pg_controldata, pg_ctlcluster
- AWS S3 and EC2 usage through Ansible and AWS CLI examples
- Disaster recovery automation concepts: backups, failover, infrastructure rebuilds, and DR drills

## Sources Consulted
- Ansible lookup plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible fileglob lookup documentation: https://ansible.readthedocs.io/projects/ansible/2.9/plugins/lookup/fileglob.html
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible ansible.builtin.include_tasks module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible ansible.builtin.import_playbook module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible amazon.aws.s3_object module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/s3_object_module.html
- Ansible amazon.aws.ec2_instance module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/17/app-pgdump.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/17/app-pgrestore.html
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL system administration functions documentation for pg_is_in_recovery(): https://www.postgresql.org/docs/17/functions-admin.html
- PostgreSQL pg_ctl documentation: https://www.postgresql.org/docs/18/app-pg-ctl.html

## Issues Found
- The S3 upload example used the `fileglob` lookup to enumerate backup files created on managed hosts. Ansible lookups run on the control node, and fileglob is explicitly local. Changed the example to use `ansible.builtin.find` on the managed host and loop over `backup_artifacts.files`.
- The database failover verification asserted that `'f'` appeared anywhere in formatted `psql` output. Changed it to `psql -tAc "SELECT pg_is_in_recovery()"` and an exact trimmed comparison to `f`.
- The rebuild restore example restored into `{{ database_name }}` without ensuring the database existed, and then parsed formatted `psql` output as an integer. Added `createdb -T template0 {{ database_name }} || true`, ran restore/verification as the `postgres` OS user, and changed the table-count query to `psql -tAc`.
- The backup verification restore example installed PostgreSQL and immediately ran `pg_restore -d appdb`, which requires the destination database to exist unless using `--create`. Added `createdb -T template0 appdb || true` before `pg_restore`.
- The backup verification queries used formatted `psql` output. Changed them to `psql -d appdb -tAc` so automation receives only scalar query output.
- The DR drill example used `include_tasks` to include files that are full playbooks. `include_tasks` is for task lists; files with a list of plays must be imported at the top level. Changed the example to top-level `ansible.builtin.import_playbook` entries.

## Review Notes
- Ansible and PostgreSQL CLI tools were not installed in the local workspace, so validation was documentation-based. The YAML code blocks were parsed with PyYAML after edits.
- The examples remain illustrative and assume environment-specific prerequisites such as AWS credentials or instance profiles, installed `amazon.aws` collection dependencies, PostgreSQL cluster paths matching Debian/Ubuntu PostgreSQL 15 packaging, SSH access to temporary EC2 instances, and application-specific roles/configuration files.
