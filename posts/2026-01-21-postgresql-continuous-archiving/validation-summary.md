# Validation Summary: How to Set Up Continuous Archiving with PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL continuous archiving
- PostgreSQL WAL and PITR
- PostgreSQL configuration
- pg_basebackup
- pg_verifybackup
- pg_archivecleanup
- Shell scripting for WAL archive commands
- Cloud object storage examples for WAL archives

## Sources Consulted
- PostgreSQL Documentation: Continuous Archiving and Point-in-Time Recovery (PITR): https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL 12 Documentation: Continuous Archiving and Point-in-Time Recovery (PITR): https://www.postgresql.org/docs/12/continuous-archiving.html
- PostgreSQL Documentation: Write Ahead Log configuration: https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL Documentation: pg_basebackup: https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL 13 Documentation: pg_basebackup: https://www.postgresql.org/docs/13/app-pgbasebackup.html
- PostgreSQL Documentation: pg_verifybackup: https://www.postgresql.org/docs/current/app-pgverifybackup.html
- PostgreSQL 13 Documentation: pg_verifybackup: https://www.postgresql.org/docs/13/app-pgverifybackup.html
- PostgreSQL Documentation: pg_archivecleanup: https://www.postgresql.org/docs/current/pgarchivecleanup.html

## Issues Found
- Archive scripts copied WAL files over existing archive files. PostgreSQL recommends archive commands refuse to overwrite existing archive files and, in current versions, return success only when an existing archived file has identical contents. Added checks with `cmp` and `gzip -cd ... | cmp` before copying.
- The compressed archive example had the same overwrite risk for `.gz` files. Added an existing-file check that validates identical uncompressed contents before returning success.
- The backup manifest section implied a single `pg_verifybackup` command was enough for the tar-format compressed backup shown earlier. Clarified that PostgreSQL 13-17 require tar-format backups to be extracted before verification, while PostgreSQL 18+ can verify tar-format backups directly with `-F t -n`.
- The recovery example only showed a plain `cp` `restore_command`, which would not restore the compressed WAL archive examples in the post. Added the corresponding `gunzip` restore command for gzip-compressed WAL archives.
- The complete archive script used a predictable temporary file name and could skip required remote archiving when a matching local archive already existed. Updated it to use a per-process temporary gzip path, clean it with a trap, and continue to S3 upload when the local archive already exists with identical contents.

## Review Notes
PostgreSQL 12 and 13 are now unsupported as of the validation date, but the post's version-specific examples were checked against PostgreSQL 12/13 docs where relevant because the post states PostgreSQL 12+. Current supported PostgreSQL docs were also checked for behavior that changed in newer releases, especially `pg_verifybackup` tar-format support.
