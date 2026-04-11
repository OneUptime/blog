# Validation Summary: How to Configure Redis Logging (logfile, loglevel, syslog)

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (server configuration)
- Linux logrotate
- syslog / journald
- Docker and Kubernetes (container logging)

## Sources Consulted
- Redis official documentation on `loglevel`, `logfile`, `syslog-enabled`, `syslog-ident`, `syslog-facility` directives (https://redis.io/docs/latest/operate/oss_and_stack/management/config/)
- Redis `CONFIG SET` / `CONFIG GET` command documentation (https://redis.io/docs/latest/commands/config-set/)
- Redis signal handling behavior (source code and documentation)
- Linux logrotate man page (`man logrotate`) for `copytruncate` directive

## Issues Found

### 1. Incorrect logrotate postrotate script (lines 74-85)
**What was wrong:** The logrotate configuration included a `postrotate` script that ran `redis-cli BGREWRITEAOF` (which triggers an AOF rewrite, completely unrelated to log rotation) and `kill -USR1` (which does NOT cause Redis to reopen its log file). Redis has no signal-based log file reopening mechanism. In Redis 7.2+, SIGUSR1 triggers an RDB snapshot; in older versions it is unhandled and would terminate the Redis process.

**What was changed:** Replaced the incorrect `postrotate` block with the `copytruncate` directive, which copies the log file and truncates the original in place so Redis continues writing to the same file descriptor.

### 2. Incorrect "signal Redis to reopen" advice (lines 89-93)
**What was wrong:** The post suggested using `redis-cli DEBUG SLEEP 0` (a no-op that sleeps for 0 seconds) followed by `kill -USR1` to reopen Redis log files. Neither command causes log file reopening. The SIGUSR1 signal is dangerous to send to older Redis versions where it is unhandled.

**What was changed:** Removed the incorrect commands and replaced with an explanation of why `copytruncate` is the recommended approach for Redis log rotation.

## Review Notes
- The four Redis log levels (`debug`, `verbose`, `notice`, `warning`) are correct and complete.
- The `notice` default log level is correct.
- The `CONFIG SET loglevel` runtime change is correct and a useful recommendation.
- The syslog directives (`syslog-enabled`, `syslog-ident`, `syslog-facility`) are all correct.
- The `logfile ""` for stdout logging is correct and a good recommendation for containerized deployments.
- The example log messages are representative of actual Redis output.
- A small window of log data can be lost with `copytruncate` between the copy and truncate operations. This is generally acceptable for Redis logging but worth noting for extremely high-throughput logging scenarios.
