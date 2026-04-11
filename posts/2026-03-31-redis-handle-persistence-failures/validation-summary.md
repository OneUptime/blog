# Validation Summary: How to Handle Redis Persistence Failures in Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (RDB and AOF persistence)
- Linux system administration (sysctl, systemd, disk management)
- Bash shell commands

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis CONFIG SET command documentation: https://redis.io/docs/latest/commands/config-set/
- Redis BGSAVE command documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis BGREWRITEAOF command documentation: https://redis.io/docs/latest/commands/bgrewriteaof/
- Linux sysctl vm.overcommit_memory documentation: https://www.kernel.org/doc/Documentation/vm/overcommit-accounting

## Issues Found

1. **Misplaced error message in Failure Mode 2 (Permission Denied):** The log example `Can't save in background: fork: Cannot allocate memory` was listed under the "Permission Denied" section, but this is a fork/memory error, not a permission error. This same class of error is correctly covered in Failure Mode 5 (Fork Failure). Removed the misplaced line so the section only shows the actual permission denied log message.

2. **Incorrect count in Summary:** The summary stated "four categories" of persistence failures, but the post covers five distinct failure modes (disk full, permission denied, stop-writes-on-bgsave-error blocking, AOF write failure, and fork failure). Updated to say "five categories" and listed all five.

## Review Notes
- The `CONFIG SET dir` command to change the Redis working directory at runtime is correct, but readers should be aware that this does not move existing RDB/AOF files to the new location. Files would need to be copied manually before changing the directory.
- All Redis field names from `INFO persistence` output are correct: `rdb_last_bgsave_status`, `rdb_last_bgsave_time_sec`, `aof_last_bgrewrite_status`, `aof_last_write_status`, `aof_delayed_fsync`.
- The `stop-writes-on-bgsave-error` default of `yes` is correctly stated.
- The `vm.overcommit_memory=1` recommendation is the standard Redis guidance for preventing fork failures.
- All bash commands (`df`, `iostat`, `sysctl`, `chown`, `chmod`, `find`, `systemctl`) use correct syntax and flags.
