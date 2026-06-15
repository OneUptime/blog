# Validation Summary: How to Configure Log Rotation Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux logrotate
- Docker json-file logging driver
- Kubernetes kubelet log rotation configuration
- Node.js Winston and winston-daily-rotate-file
- Python logging.handlers
- Java Logback rolling appenders
- Bash monitoring commands

## Sources Consulted
- logrotate local man page and `logrotate --help` output
- Docker JSON File logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/
- Kubernetes kubelet configuration API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- winston-daily-rotate-file documentation: https://github.com/winstonjs/winston-daily-rotate-file
- Python logging.handlers documentation: https://docs.python.org/3/library/logging.handlers.html
- Logback appenders manual: https://logback.qos.ch/manual/appenders.html
- Docker CLI `docker run --help` output

## Issues Found
- The web server log volume calculation was incorrect. 1,000 requests per minute at 500 bytes per request is about 8KB per second, 720MB per day, or 21GB per month, not 30KB per second, 2.5GB per day, or 75GB per month.
- The logrotate scheduling description said it runs daily via cron. Updated it to include cron or systemd timers, which reflects current Linux distributions.
- The wildcard logrotate example used `postrotate` without `sharedscripts`, which would reload the service once per rotated matching log. Added `sharedscripts` so the reload runs once for the wildcard group.
- The `copytruncate` audit-log example claimed it ensures no logging gap. Updated the comment because logrotate documents a small data-loss window between copying and truncating.
- The audit-log `copytruncate` example included `create`, but `create` has no effect with `copytruncate` because the original file remains in place. Removed the ineffective directive from that block.
- The Python example used a hand-written JSON-looking formatter that could produce invalid JSON when messages contain quotes or other characters needing escaping. Changed it to a plain text formatter.
- The Python time-based handler was labeled as audit logging even though it received all INFO-and-above records from the same logger. Renamed the example file/comment to daily logs.

## Review Notes
- The remaining examples use current option names and formats according to the consulted documentation.
- For production Python JSON logs, use a JSON-aware formatter or library rather than manually composing JSON with `logging.Formatter`.
