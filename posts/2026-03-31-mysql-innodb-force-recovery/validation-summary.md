# Validation Summary: How to Use innodb_force_recovery in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- innodb_force_recovery configuration
- mysqldump
- systemd (systemctl)

## Sources Consulted
- MySQL 8.0 Reference Manual — Forcing InnoDB Recovery: https://dev.mysql.com/doc/refman/8.0/en/forcing-innodb-recovery.html
- MySQL 8.0 Reference Manual — Data Directory Initialization: https://dev.mysql.com/doc/refman/8.0/en/data-directory-initialization.html
- MySQL 8.0 Reference Manual — mysqldump options: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html

## Issues Found

### 1. Incorrect description of force recovery Level 5
- **What was wrong:** The table described Level 5 as "Skip undo log lookups for read views (dangerous)." The actual behavior per the MySQL docs is that InnoDB does not look at undo logs when starting the database and treats even incomplete transactions as committed.
- **What was changed:** Updated to "Do not look at undo logs at startup; treat incomplete transactions as committed (dangerous)."
- **Why:** The "for read views" framing was misleading. The undo log skip applies at startup and affects transaction completeness, not just read views.

### 2. Incorrect description of force recovery Level 6
- **What was wrong:** The table described Level 6 as "Skip corrupted pages without crashing; very dangerous." Level 6 is actually SRV_FORCE_NO_LOG_REDO, which skips redo log roll-forward during recovery. Skipping corrupted pages is Level 1's behavior.
- **What was changed:** Updated to "Skip redo log roll-forward during recovery; very dangerous."
- **Why:** This was a factual error. Level 6 leaves database pages in an obsolete state by not applying the redo log, which can introduce additional corruption into B-trees and other structures.

### 3. Rebuild section used selective file deletion instead of clearing the data directory
- **What was wrong:** The rebuild commands selectively deleted `ibdata1`, `ib_logfile*`, and `*.ibd` files, then ran `mysqld --initialize`. However, `--initialize` requires the data directory to be empty or nonexistent. The selective deletion would leave behind database subdirectories, system files, and other contents, causing `--initialize` to fail.
- **What was changed:** Replaced the selective `rm` commands with `mv` to back up the old data directory, then `mkdir` + `chown` to create a fresh empty directory. Also added a comment noting the temporary root password from `--initialize` output.
- **Why:** `mysqld --initialize` aborts with an error if the data directory is not empty. Moving the entire directory and creating a fresh one is the correct approach.

## Review Notes
- The blog correctly advises starting at level 1 and incrementing, which matches the official MySQL recommendation.
- The mysqldump flags used (`--single-transaction`, `--skip-lock-tables`, `--skip-add-locks`, `--no-tablespaces`) are appropriate for dumping under force recovery conditions.
- The safety precautions section recommending `read_only=ON` and `super_read_only=ON` is good practice, especially for levels 1-3 where InnoDB does not automatically enforce read-only mode (levels 4+ set InnoDB to read-only automatically).
- In MySQL 8.0.30+, redo log files moved from `ib_logfile*` in the data directory to a `#innodb_redo` subdirectory. The old path is still correct for earlier 8.0 versions, but readers on newer versions should be aware of this change.
- After `mysqld --initialize`, a temporary root password is generated and printed to stderr. The user must log in with that password and change it before running other commands, including the restore. The blog's restore command may require an intermediate password-reset step in practice.
