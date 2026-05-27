# Validation Summary: How to Use Ansible to Automate Database Backups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- PostgreSQL
- MySQL
- Bash
- GnuPG
- AWS CLI / Amazon S3
- cron

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- MySQL mysqldump documentation: https://dev.mysql.com/doc/en/mysqldump.html
- GnuPG gpg manual: https://gnupg.org/documentation/manuals/gnupg26/gpg.1.html
- AWS CLI s3 cp documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- The PostgreSQL backup template always used `--compress=9`, even when `backup_compress` was false. Changed it to render `--compress={{ 9 if backup_compress else 0 }}` so the setting actually controls pg_dump custom-format compression.
- The PostgreSQL backup template wrote a custom-format archive through stdout to a `.sql.dump` path and then optionally gzipped it. Changed it to use a `.dump` filename and pg_dump's `--file` option, which matches PostgreSQL's documented custom archive output behavior.
- The GnuPG encryption commands supplied `--passphrase` in batch mode without `--pinentry-mode loopback`. Added `--pinentry-mode loopback` to both PostgreSQL and MySQL templates, as required for passphrase options with modern GnuPG.
- The verification script comment said it verified backups were valid, but the script checks only existence and age. Updated the comment to say it verifies that recent backups exist and are not stale.

## Review Notes
- The MySQL dump command options are valid, but `--single-transaction` gives a consistent snapshot only for transactional tables such as InnoDB.
- The templates pass database and encryption passwords on command lines or environment variables. This works technically, but a future hardening pass should consider credential files, restricted environment handling, or backup tooling that avoids exposing secrets in process metadata.
