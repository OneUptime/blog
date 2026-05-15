# Validation Summary: How to Set Up Incremental Backups with rdiff-backup on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- rdiff-backup
- SSH
- cron
- Bash

## Sources Consulted
- rdiff-backup official site: https://rdiff-backup.net/
- rdiff-backup upstream README and installation instructions: https://github.com/rdiff-backup/rdiff-backup
- rdiff-backup 2.2.6 man page: https://manpages.debian.org/unstable/rdiff-backup/rdiff-backup.1.en.html
- rdiff-backup old/deprecated CLI man page: https://manpages.debian.org/unstable/rdiff-backup/rdiff-backup-old.1.en.html
- Fedora package metadata for EPEL 9 rdiff-backup: https://packages.fedoraproject.org/pkgs/rdiff-backup/rdiff-backup/

## Issues Found
- The installation steps omitted the RHEL 9 CodeReady Builder prerequisite used by the upstream RHEL/EPEL installation instructions. Added the `subscription-manager` command to enable the RHEL 9 CodeReady Builder repository before installing from EPEL.
- The pip fallback omitted required build dependencies and did not mention the Python 3.10+ requirement for current rdiff-backup releases. Updated the dependency list and added the Python version caveat.
- The command examples used the old rdiff-backup CLI form. EPEL 9 ships rdiff-backup 2.2.x, whose documented current CLI is action-based and whose traditional CLI is deprecated. Updated backup, restore, list, compare, remove, and verify examples to the current action syntax.
- The automated retention command could fail when deleting multiple old sessions because rdiff-backup requires `--force` in that case. Added `--force` to the scripted and manual retention examples.
- The statistics example used `--calculate-average` against the backup repository root, but the calculate command expects one or more statistics files. Updated it to calculate against `rdiff-backup-data/session_statistics.*.data`.
- The final retention reference used the old `--remove-older-than` syntax. Updated it to the current `remove increments --older-than` syntax.

## Review Notes
The old rdiff-backup command form is still documented for compatibility, but it is deprecated in rdiff-backup 2.1+ and should not be used for new RHEL 9 guidance. Remote examples are syntactically correct, but both systems must have compatible rdiff-backup installations available over SSH.
