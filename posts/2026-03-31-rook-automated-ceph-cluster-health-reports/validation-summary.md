# Validation Summary: How to Create Automated Ceph Cluster Health Reports

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CLI tools: `ceph health`, `ceph status`, `ceph osd stat`, `ceph mon stat`, `ceph df`, `ceph pg stat`)
- Bash shell scripting
- Cron job scheduling
- Logrotate
- mail (mailutils)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph CLI reference: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph `--format` output options: https://docs.ceph.com/en/latest/man/8/ceph/
- Logrotate man page: https://man7.org/linux/man-pages/man8/logrotate.8.html
- Crontab syntax reference: https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found

1. **Incorrect claim about `ceph health` exit codes**: The "Parsing Health Output for Alerting" section described the approach as using "exit codes" to trigger alerts, but `ceph health` returns exit code 0 regardless of cluster health status (HEALTH_OK, HEALTH_WARN, HEALTH_ERR). The script actually parses the text output with `grep`, which is the correct approach. Fixed the description to say "Parse the `ceph health` output" instead. Also fixed the summary paragraph which referenced "exit-code-based alerting".

2. **Daily cron job would not email the report**: The original cron entry `0 7 * * * /usr/local/bin/ceph-health-report.sh | mail -s "Daily Ceph Report" ops@example.com` piped the script's stdout to mail. However, the script writes all report data to a file and only outputs "Report written to ..." to stdout, so the email would contain just that one-line message, not the actual health report. Fixed by replacing with inline ceph commands piped directly to mail.

3. **Append operator would produce invalid JSON**: The command `ceph health detail --format json-pretty >> /var/log/ceph/health-...json` used `>>` (append). If run more than once per day, this would append multiple JSON objects to the same file, producing invalid JSON. Changed to `>` (overwrite) to ensure a valid JSON file.

## Review Notes
- The logrotate configuration uses a wildcard pattern (`health-report-*.txt`) with timestamped filenames. This works for cleanup purposes (compressing and eventually removing old files), though it differs from the traditional logrotate pattern of rotating a single fixed-name log file. This is acceptable for this use case.
- All Ceph CLI commands (`ceph health detail`, `ceph status`, `ceph osd stat`, `ceph mon stat`, `ceph df`, `ceph pg stat`, `--format json-pretty`) are valid and current.
- The post mentions Rook in the tags but does not cover Rook-specific tooling (e.g., running ceph commands via the Rook toolbox pod). The content is applicable to any Ceph deployment, not just Rook-managed clusters.
