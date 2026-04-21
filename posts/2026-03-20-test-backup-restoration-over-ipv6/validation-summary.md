# Validation Summary: How to Test Backup Restoration over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking
- Bash scripting
- rsync over SSH
- OpenSSH ssh and scp
- PostgreSQL createdb, pg_restore, psql, and dropdb
- PostgreSQL information_schema
- BorgBackup
- cron / crontab scheduling

## Sources Consulted
- RFC 4291 IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849 IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849
- rsync man page: https://download.samba.org/pub/rsync/rsync.1
- OpenSSH ssh manual: https://man.openbsd.org/ssh
- OpenSSH scp manual: https://man.openbsd.org/scp.1
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL createdb documentation: https://www.postgresql.org/docs/current/app-createdb.html
- PostgreSQL dropdb documentation: https://www.postgresql.org/docs/current/app-dropdb.html
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL information_schema documentation: https://www.postgresql.org/docs/current/information-schema.html
- BorgBackup general usage and repository URL documentation: https://borgbackup.readthedocs.io/en/stable/usage/general.html
- BorgBackup extract documentation: https://borgbackup.readthedocs.io/en/stable/usage/extract.html
- BorgBackup list documentation: https://borgbackup.readthedocs.io/en/stable/usage/list.html
- BorgBackup check documentation: https://borgbackup.readthedocs.io/en/stable/usage/check.html
- BorgBackup location parser source for bracketed IPv6 repository URLs: https://github.com/borgbackup/borg/blob/1.4-maint/src/borg/helpers/parseformat.py
- Linux crontab(5) manual: https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found
- The examples used `2001:db8::backup`, which is not a syntactically valid IPv6 address because IPv6 address fields are hexadecimal. Updated the examples to use `2001:db8::10`, which is inside the RFC 3849 documentation prefix.
- The file restore test used an unquoted path in the `ls -A` check. Quoted the restore path so the test remains valid if the directory variable ever contains shell-sensitive characters.
- The PostgreSQL restore example piped `pg_restore` through `tail`, which could hide a failed restore because the pipeline status would come from `tail`. Changed it to run `pg_restore --exit-on-error`, capture the restore log, print the last lines, and exit on restore failure.
- The PostgreSQL verification query counted all visible `information_schema.tables` entries, including system schemas. Updated it to count user base tables outside `pg_catalog` and `information_schema`.
- The Borg example used deprecated scp-style repository syntax and did not explicitly force IPv6. Updated it to use an `ssh://` repository URL with a bracketed IPv6 literal and `BORG_RSH="ssh -6"`.
- The Borg restore example used `borg extract --destination`, but Borg 1.4 documents that extraction writes to the current working directory and has no `--destination` option. Updated the example to `cd` into the restore directory before extracting.
- The Borg integrity check printed `Repository integrity: OK` regardless of the `borg check` exit status. Wrapped the check in an `if` block so failures are reported and return a non-zero status.
- The RTO rsync example used `2>&1 > /tmp/rto-rsync.log`, which leaves stderr on the original stdout instead of writing both streams to the log. Corrected the redirection order to `> /tmp/rto-rsync.log 2>&1`.
- The `/etc/cron.d` examples used shell-style backslash continuations, but crontab entries are parsed line by line. Collapsed each cron entry onto a single line.

## Review Notes
Local syntax checks with `bash -n` passed for the shell script examples after the fixes. BorgBackup and PostgreSQL client binaries were not installed in the local environment, so those commands were validated against official documentation and Borg source rather than executed end to end.
