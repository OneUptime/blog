# Validation Summary: How to Configure Restic for Application Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Restic
- Linux shell scripting
- Amazon S3 and S3-compatible storage
- SFTP
- PostgreSQL backups with pg_dump
- MongoDB backups with mongodump
- systemd services and timers

## Sources Consulted
- Restic installation documentation: https://restic.readthedocs.io/en/stable/020_installation.html
- Restic repository preparation documentation: https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html
- Restic backup documentation: https://restic.readthedocs.io/en/stable/040_backup.html
- Restic restore documentation: https://restic.readthedocs.io/en/stable/050_restore.html
- Restic snapshot removal documentation: https://restic.readthedocs.io/en/stable/060_forget.html
- Restic repository integrity documentation: https://restic.readthedocs.io/en/stable/045_working_with_repos.html
- Restic reference documentation for encryption, deduplication, and repository format: https://restic.readthedocs.io/en/stable/100_references.html
- Restic GitHub release page for v0.19.0: https://github.com/restic/restic/releases/tag/v0.19.0
- systemd.timer manual: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- SUSE systemd timer documentation: https://documentation.suse.com/smart/systems-management/html/systemd-working-with-timers/index.html

## Issues Found
- The post described the v0.16.4 binary download as the latest release. Updated the direct download example and version output to Restic v0.19.0, the latest GitHub release as of 2026-06-15.
- The Fedora/RHEL/CentOS installation example implied one `dnf install restic` command applied to all three. Split Fedora from RHEL/CentOS Stream and added the EPEL repository setup required by Restic's installation documentation.
- The S3 examples used the generic `s3.amazonaws.com` endpoint. Updated examples to a region-specific path-style endpoint (`s3.us-east-1.amazonaws.com`), matching current Restic S3 documentation.
- The example snapshot ID `5f6g7h8i` contained non-hex characters, while Restic snapshot IDs are SHA-256-derived hexadecimal IDs. Replaced it with a valid hex-style example.
- The backup flow diagram used the phrase "Update Snapshot Index," which is not how Restic describes repository writes. Reworded it to "Write Index and Snapshot."
- The application backup script stopped the service before the backup but would not restart it if `restic backup` failed under `set -e`. Added an `EXIT` trap to restart the service.
- The introduction said incremental backups are "nearly instantaneous," which overstates behavior because Restic still scans metadata and may read changed files. Reworded it to "much faster."
- The post said Restic requires "a running process" to manage backups, which could imply a daemon. Reworded it to say Restic needs to be run or scheduled.

## Review Notes
The remaining commands and configuration snippets are consistent with current Restic documentation. The post uses example credentials in shell and systemd snippets; this is acceptable for a tutorial, but a production article could further recommend systemd credential mechanisms or external secret injection instead of embedding access keys directly in unit files.
