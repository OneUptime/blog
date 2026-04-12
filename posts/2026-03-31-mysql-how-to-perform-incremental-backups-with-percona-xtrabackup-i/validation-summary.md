# Validation Summary: How to Perform Incremental Backups with Percona XtraBackup in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Percona XtraBackup 8.0
- InnoDB storage engine
- Linux system administration (systemctl, apt, yum)

## Sources Consulted
- Percona XtraBackup 8.0 official documentation: https://docs.percona.com/percona-xtrabackup/8.0/
- Percona XtraBackup incremental backup documentation: https://docs.percona.com/percona-xtrabackup/8.0/create-incremental-backup.html
- Percona XtraBackup prepare/restore documentation: https://docs.percona.com/percona-xtrabackup/8.0/prepare-incremental-backup.html
- MySQL 8.0 GRANT statement reference: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 privilege reference: https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html

## Issues Found
1. **Incorrect description of `--apply-log-only` behavior (line 100 heading and line 109 explanation):**
   - **What was wrong:** The section heading said "Do Not Roll Forward Yet" and the explanation stated that `--apply-log-only` "prevents XtraBackup from rolling forward uncommitted transactions." This is incorrect. The `--apply-log-only` flag prevents the **rollback** (undo) of uncommitted transactions, not the rolling forward. The redo log replay (roll forward of committed transactions) still occurs during the prepare phase. The rollback is suppressed because uncommitted transactions at the time of the base backup may have been committed by the time an incremental was taken; rolling them back would cause data loss when applying incrementals.
   - **What was changed:** Changed the heading from "(Do Not Roll Forward Yet)" to "(Do Not Roll Back Yet)" and changed the explanation from "rolling forward" to "rolling back."
   - **Why:** This is a critical conceptual distinction for understanding how XtraBackup's prepare phase works with incremental backups.

## Review Notes
- The installation commands assume the Percona APT/YUM repository has already been configured. Users will need to add the Percona repository first using `percona-release` before these install commands will work. This is not technically incorrect but could be mentioned.
- The `backup_type = full-backuped` value in the xtrabackup_checkpoints example is correct — this is the actual string XtraBackup uses (it is a known quirk, not a typo).
- The backup strategy example uses `date -d yesterday` which is GNU date syntax (Linux). This would not work on macOS, but since MySQL servers typically run on Linux, this is acceptable.
- The glob pattern in `--incremental-basedir=/backups/$(date -d yesterday +%Y%m%d)_*` is a shell glob that would expand before being passed to xtrabackup. This works only if exactly one directory matches. The `...` at the end suggests this is pseudocode rather than production-ready scripting.
- The SQL GRANT statement syntax is correct for MySQL 8.0, which supports granting both static and dynamic privileges in a single statement with `ON *.*`.
