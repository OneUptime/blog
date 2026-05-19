# Validation Summary: How to Set Up Automated Database Backup Testing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash scripting (`set -euo pipefail`, traps, command substitution)
- MySQL client (`mysql`, command-line auth, SQL queries against `information_schema`)
- PostgreSQL client (`pg_restore`, `psql`, `createdb`, `dropdb`)
- gzip (`-t` integrity testing, `zcat`)
- GPG (`--batch --decrypt --output` for non-interactive decryption)
- Cron (scheduled task syntax)
- Ubuntu/Linux conventions (`/var/backups`, `/var/log`, `/usr/local/bin`, `mail` command)
- `bc` for floating-point arithmetic and comparison

## Sources Consulted
- MySQL Reference Manual — `mysql` client and `information_schema.tables` (https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html)
- PostgreSQL `pg_restore` documentation — `--list`, `--no-owner`, `--no-privileges`, `--jobs`, `--dbname` (https://www.postgresql.org/docs/current/app-pgrestore.html)
- PostgreSQL `psql` documentation — `-t`, `-A`, `-c` flags (https://www.postgresql.org/docs/current/app-psql.html)
- GNU gzip manual — `-t` test integrity flag (https://www.gnu.org/software/gzip/manual/gzip.html)
- GnuPG manual — `--batch`, `--decrypt`, `--output` (https://www.gnupg.org/documentation/manuals/gnupg/)
- crontab(5) man page — schedule expression syntax
- Bash manual — `set -euo pipefail`, `trap ... EXIT`, `$$`, command substitution

## Issues Found
No technical issues found. All scripts, commands, flags, SQL queries, and cron expressions are syntactically correct and use current, non-deprecated APIs. The logic for finding the most recent backup, integrity-testing it, restoring to a uniquely-named test database, validating table/row counts, and cleaning up via an `EXIT` trap is sound. The PostgreSQL script correctly assumes a custom-format dump (`.dump` extension) for which `pg_restore --list` is appropriate.

## Review Notes
- Passing the MySQL password on the command line via `-p"$MYSQL_PASSWORD"` works but produces a "Using a password on the command line interface can be insecure" warning. The script suppresses stderr with `2>/dev/null`, which is a reasonable workaround. For production use, a `~/.my.cnf` with `[client]` credentials and restricted file permissions would be more secure — but this is a hardening recommendation, not a correctness issue.
- The variance check only fails when the backup has *fewer* rows than production. If the backup had more rows (unusual but possible if the prod table was truncated), the variance would be negative and the check would pass. This appears to be a deliberate design choice consistent with the comment "accounting for recent inserts."
- `pg_restore --list` only works on custom, directory, or tar-format dumps — not plain SQL dumps. The script's `*.dump` glob implies custom format, which is the correct convention.
- Minor shell-quoting hardening could be added (e.g., `du -sh "$BACKUP_FILE"`, `"$(dirname "$LOG_FILE")"`), but the controlled paths used here mean these are stylistic rather than functional issues.
- The example cron entries run as root (via `sudo crontab -e`), which is necessary for accessing `/var/backups` and `/var/log/backup-tests`. Consider running as a dedicated `backup-test` user with `sudoers` rules instead for least-privilege.
