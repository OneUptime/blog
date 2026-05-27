# Validation Summary: How to Use Ansible to Backup Databases

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- PostgreSQL
- MySQL
- MongoDB
- AWS CLI
- Amazon S3
- Cron

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `community.postgresql.postgresql_query` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `pg_basebackup` documentation: https://www.postgresql.org/docs/current/app-pgbasebackup.html
- MySQL `mysqldump` documentation: https://dev.mysql.com/doc/refman/9.7/en/mysqldump.html
- MongoDB Database Tools `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- AWS CLI `s3 sync` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html

## Issues Found
- The scheduled cron example referenced `{{ db_type }}` but the inventory did not define it. Added per-group `db_type` variables for PostgreSQL, MySQL, and MongoDB hosts so the scheduled playbook path resolves correctly.
- The MySQL playbook ran an initial `mysqldump` task that captured dump output in Ansible without writing it to the backup file, then ran `mysqldump` again for the real backup. Removed the duplicate task to avoid unnecessary memory use and duplicate database load.
- The MySQL gzip pipeline could report success if `mysqldump` failed because the shell would otherwise return the status of `gzip`. Added `set -o pipefail` and `executable: /bin/bash` so dump failures fail the task.
- The MySQL shell command interpolated credentials and paths without shell quoting. Added Ansible's `quote` filter for the shell-sensitive values.
- The S3 upload playbook used vault AWS variables but did not load the vault file. Added the same `vars_files` reference used by the database backup playbooks.
- The post recommends enabling S3 server-side encryption, but the upload command did not request it. Added `--sse AES256` to the `aws s3 sync` command.
- The S3 upload task passed secrets through the task environment without `no_log`. Added `no_log: true` to avoid exposing credentials in Ansible output.
- The MongoDB cleanup task called the dump directory "uncompressed" even though `mongodump --gzip` compresses dumped files. Renamed it to "temporary dump directory."
- The MySQL `--single-transaction` tip implied the option applies universally. Clarified that it applies to transactional tables such as InnoDB and that non-transactional cases need another locking strategy.

## Review Notes
The remaining examples are broadly correct for current Ansible, PostgreSQL, MySQL, MongoDB Database Tools, and AWS CLI syntax. In a production version, the post could further improve restore verification by adding actual `pg_restore`, `mysql`, or `mongorestore --dryRun` style checks where appropriate, because the current playbooks mostly verify file creation rather than full restoreability.
