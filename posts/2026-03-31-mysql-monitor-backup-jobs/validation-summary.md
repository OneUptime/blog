# Validation Summary: How to Monitor MySQL Backup Jobs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE TABLE, ENUM types, DATETIME defaults, window functions with LAG())
- mysqldump (--single-transaction, --routines, --triggers, --events)
- Bash scripting (backup automation, pipeline error handling)
- Prometheus node_exporter textfile collector
- Slack incoming webhooks (alert integration via curl)
- GNU coreutils (stat -c%s)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — mysqldump options: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual — Window Functions (LAG): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- Bash Reference Manual — Pipelines and pipefail: https://www.gnu.org/software/bash/manual/bash.html#Pipelines
- Prometheus node_exporter textfile collector: https://github.com/prometheus/node_exporter#textfile-collector
- Slack API — Incoming Webhooks: https://api.slack.com/messaging/webhooks

## Issues Found
- **Missing `set -o pipefail` in backup script**: The script used `mysqldump ... | gzip > file` inside an `if` conditional. In bash, the exit status of a pipeline defaults to the exit status of the last command (`gzip`), not the first (`mysqldump`). If `mysqldump` fails but `gzip` runs successfully (producing an empty or corrupt compressed file), the script would incorrectly log the backup as successful. This directly defeats the purpose of backup monitoring. **Fix:** Added `set -o pipefail` after the shebang line so the pipeline returns a non-zero exit status if any command in the pipeline fails.

## Review Notes
- The `stat -c%s` flag is GNU/Linux-specific. On macOS, the equivalent is `stat -f%z`. Since MySQL servers predominantly run on Linux, this is acceptable for the target audience but could trip up readers testing locally on macOS.
- The `LAG()` window function requires MySQL 8.0+. The post does not specify a minimum MySQL version. This is fine since MySQL 8.0 is the current GA release, but readers on MySQL 5.7 would encounter errors on the file size trend query.
- The `LAST_INSERT_ID()` approach in the bash script works because the mysql client allows multiple semicolon-separated statements with `-e`. This is correct behavior.
- The 26-hour window for detecting missing daily backups is a good practice that accounts for scheduling drift.
