# Validation Summary: How to Set Up Automated Backups with rsync and Cron on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- rsync
- cron/crontab
- Bash scripting
- GNU findutils
- PostgreSQL pg_dumpall
- MariaDB/MySQL mysqldump
- mail command notifications

## Sources Consulted
- rsync official man page: https://download.samba.org/pub/rsync/rsync.1
- Red Hat Enterprise Linux documentation for automating system tasks with cron: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- GNU findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Local system man pages and help output for `rsync`, `crontab`, `crontab(5)`, and `find`

## Issues Found
- The rotation cleanup commands used `find "$BACKUP_BASE/daily" -maxdepth 1 -type d ...` and equivalent commands for weekly and monthly backups. Because `find` applies tests and actions to the command-line argument itself unless constrained, those commands could match and remove the retention parent directories. Added `-mindepth 1` to each cleanup command so only dated child backup directories are eligible for deletion.
- The post said the setup did not need "any extra software" and later "zero extra software required." That was too broad because the examples depend on tools such as rsync, cron, database dump utilities, and `mail`. Changed the wording to say it does not require a dedicated backup application or backup suite.

## Review Notes
- The rsync options shown are current and valid. `--link-dest` is correctly described as creating hard links for unchanged files when the source and comparison files match in preserved attributes.
- The cron examples use valid five-field user crontab syntax for `sudo crontab -e`; no username field is needed in that context.
- The shell snippets are syntactically valid Bash.
