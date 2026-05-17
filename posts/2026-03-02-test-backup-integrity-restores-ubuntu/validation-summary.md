# Validation Summary: How to Test Backup Integrity and Practice Restores on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GNU tar (archive integrity testing)
- gzip (compression testing)
- rsync (file synchronization and verification)
- BorgBackup (deduplicating backup tool)
- PostgreSQL (`pg_restore`, `pg_dump` custom-format archives)
- MySQL (`mysqldump` / `mysql` restore)
- Bash scripting (`set -euo pipefail`, arithmetic, find, stat)
- cron / crontab scheduling
- Ubuntu system administration

## Sources Consulted
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html (specifically `--test-label`, `--list`, `--extract`, `--directory`)
- gzip(1) manual page (`--test` flag behavior)
- rsync(1) manual page (`--dry-run`, `--checksum`, `--archive`)
- BorgBackup documentation: https://borgbackup.readthedocs.io/ (`borg check`, `--verify-data`, `--last`, `borg info`)
- PostgreSQL `pg_restore` documentation: https://www.postgresql.org/docs/current/app-pgrestore.html (`--list`, `--format=custom`, `--no-owner`, `--dbname`)
- MySQL `mysqldump`/`mysql` client documentation
- Bash reference manual on `set -e` and arithmetic evaluation: https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin
- crontab(1) / crontab(5) for cron syntax and `crontab -l`/`crontab -` install semantics

## Issues Found

1. **Misleading `tar --test-label` comment.** The comment claimed `tar --test-label` "checks headers and checksums," but per the GNU tar manual this command only reads the volume label and exits — it does not validate the rest of the archive. **Fix:** rewrote the comment to accurately describe the command as a quick smoke test that the header is readable. The other commands in the same block (full `tar --list`, `gzip --test`) already perform the real integrity check.

2. **`pg_restore … | head -1` does not read the entire dump.** The comment said "reads entire file, does not write," but piping `pg_restore` output to `head -1` causes `pg_restore` to receive SIGPIPE after emitting one line, so most of the file is never read. **Fix:** changed the command to `pg_restore --format=custom … > /dev/null`, which actually reads the entire dump while discarding the SQL output.

3. **`((ERRORS++))` is unsafe under `set -euo pipefail`.** With post-increment, `((ERRORS++))` returns the *old* value of `ERRORS`. When `ERRORS=0`, the arithmetic expression evaluates to 0, which gives an exit status of 1, causing `set -e` to terminate the script on the very first error path. This was reproduced locally. **Fix:** replaced all nine occurrences with `((++ERRORS))` (pre-increment), which returns the new value (≥1) and yields exit status 0.

4. **Broken `crontab` append pipeline.** The line `echo "0 4 * * 0 …" | sudo crontab -l | cat - | sudo crontab -` does not append the new entry: `crontab -l` ignores stdin, so the `echo` output is discarded, and the resulting pipeline just re-installs the existing crontab unchanged. **Fix:** replaced with `(sudo crontab -l 2>/dev/null; echo "0 4 * * 0 /usr/local/bin/verify-backups.sh") | sudo crontab -`, the standard idiom that concatenates the existing crontab with the new entry.

## Review Notes
- The `((++ERRORS))` fix is the minimal change; the script would be even safer with explicit `ERRORS=$((ERRORS+1))` assignments, but the pre-increment form is idiomatic and resolves the `set -e` interaction.
- The crontab idiom now used will append the line every time the snippet is run; readers should run it once or guard against duplicates.
- `du -sh` (used to compare source vs backup size) reports disk usage, which can differ between filesystems even when content is identical — readers should treat the comparison as approximate. Left as-is; this is presented as a sanity check rather than a strict equality test.
- `tar --extract` without an explicit `-z`/`--gzip` flag relies on GNU tar's auto-detection of compression. This works on modern Ubuntu (GNU tar ≥ 1.15) and is correct as written.
- The script schedules itself for `0 4 * * 0` (Sunday 04:00) which matches the stated "weekly" cadence — consistent and correct.
