# Validation Summary: How to Set Up MongoDB Log Rotation with logRotate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (systemLog configuration, logRotate modes, SIGUSR1 signal handling)
- Linux logrotate utility
- Linux cron
- Bash shell scripting

## Sources Consulted
- logrotate(8) man page — https://man7.org/linux/man-pages/man8/logrotate.8.html (for `size` vs `maxsize` vs `minsize` behavior, `sharedscripts` directive)
- MongoDB documentation on log rotation and `logRotate` configuration options (`rename` vs `reopen` modes)
- MongoDB documentation on SIGUSR1 signal handling for log rotation

## Issues Found

1. **Incorrect comment for `sharedscripts` directive**: The comment read "Use copytruncate or send signal" which does not describe what `sharedscripts` does. `sharedscripts` means the postrotate script runs only once for all matched log files, not once per file. Fixed the comment to "Run postrotate script only once for all matched logs".

2. **`size` used instead of `maxsize` in weekly rotation config**: The post used `size 500M` alongside `weekly`, with a comment suggesting they work as an OR condition ("rotate weekly or when file exceeds 500MB"). In logrotate, `size` is mutually exclusive with time-based directives — the last one specified wins, so `size` would override `weekly`. The correct directive for OR behavior (rotate on time OR size, whichever comes first) is `maxsize`. Changed `size 500M` to `maxsize 500M`.

3. **Cron alternative incompatible with `logRotate: reopen` mode**: The cron job section only sends SIGUSR1 to MongoDB without first renaming/moving the log file. With `logRotate: reopen` (configured in the Prerequisites section), MongoDB simply closes and reopens the same file — no actual rotation occurs. This approach only works with `logRotate: rename` (the default), where MongoDB itself handles renaming the log file. Added a note clarifying that this cron approach requires `logRotate: rename` instead of `reopen`.

## Review Notes
- The `copytruncate` section correctly notes the small window for log loss, which is accurate.
- The PID file path `/var/run/mongodb/mongod.pid` is distribution-specific but correct for common setups.
- The logrotate state file path `/var/lib/logrotate/status` is Debian/Ubuntu-specific; on RHEL/CentOS it may be at `/var/lib/logrotate/logrotate.status` or `/var/lib/logrotate.status`. This is a minor portability note, not an error.
