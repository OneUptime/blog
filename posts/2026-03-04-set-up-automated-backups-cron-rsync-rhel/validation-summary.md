# Validation Summary: How to Set Up Automated Backups with Cron and rsync on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- cron and crond
- rsync
- Bash scripting
- GNU findutils
- systemd service status checks

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, "Automating System Tasks": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- Red Hat Enterprise Linux 4 System Administration Guide, "Automated Tasks": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/4/html/system_administration_guide/automated_tasks
- rsync official command help and project documentation: https://rsync.samba.org/
- GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Local `crontab(5)` manual page for user and system crontab syntax
- Local Bash help and syntax check with `bash -n`

## Issues Found
- The backup script used a space-separated `SOURCE` string. This worked for the listed paths, but was fragile shell parsing. Changed it to a Bash array and quoted array expansion so each source path is handled as one item.
- The script did not preserve rsync failures in its final exit status. Added a `STATUS` variable, rsync failure tracking, destination creation failure handling, and a final `exit "$STATUS"` so cron and notification logic can detect failures.
- The retention command used `find "$BACKUP_DIR" -maxdepth 1 ...`, which can match the starting backup directory itself. Added `-mindepth 1` so only timestamped child backup directories are removed.
- The retention cleanup did not affect the script status if cleanup failed. Wrapped the `find` command so a cleanup error sets the script status to failure.
- The root crontab example included `/usr/local/bin/full-backup.sh`, but the post never created that script. Removed the undefined cron entry.
- The `/etc/cron.d` example used `sudo cat > /etc/cron.d/system-backup`, where the redirection is performed by the user's shell rather than by `sudo`. Changed it to `sudo tee /etc/cron.d/system-backup > /dev/null`.
- The email notification snippet checked `$?` when appended at the end of the script, which would reflect the previous command rather than the rsync backup result. Changed it to check the script's `STATUS` variable before the final exit.

## Review Notes
- The `mail` command requires a local mail utility and mail delivery configuration, which varies by RHEL installation.
- `systemctl status crond` is appropriate for RHEL releases using systemd and the `crond` service.
