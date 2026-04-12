# Validation Summary: How to Migrate Redis Data with RDB File Transfer

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Redis (RDB persistence, BGSAVE, SAVE, LASTSAVE, CONFIG GET, DBSIZE, RANDOMKEY)
- redis-cli
- redis-check-rdb
- scp, rsync, AWS S3 (for file transfer)
- systemd (systemctl, journalctl)

## Sources Consulted
- Redis source code `rdb.h` across versions 2.6, 2.8, 3.2, 4.0, 5.0, 6.0, 7.0, 7.2 (https://github.com/redis/redis)
- Redis RDB Version History (https://rdb.fnordig.de/version_history.html)
- redis-rdb-tools RDB version documentation (https://github.com/sripathikrishnan/redis-rdb-tools/blob/master/docs/RDB_Version_History.textile)
- Redis LASTSAVE command documentation (https://redis.io/docs/latest/commands/lastsave/)
- Redis CONFIG GET command documentation (https://redis.io/docs/latest/commands/config-get/)
- Redis BGSAVE command documentation (https://redis.io/docs/latest/commands/bgsave/)
- Ubuntu manpage for redis-check-rdb confirming availability in Redis 4.0.9 (https://manpages.ubuntu.com/manpages/bionic/man1/redis-check-rdb.1.html)

## Issues Found
1. **RDB version table had three incorrect mappings.** Redis 2.8 was listed as RDB version 7 (correct: 6), Redis 3.2 was listed as RDB version 8 (correct: 7), and Redis 4.0 was listed as RDB version 9 (correct: 8). The versions were shifted up by one for these three entries. Verified against `RDB_VERSION` / `REDIS_RDB_VERSION` constants in the Redis source code `rdb.h` for each release branch. Fixed all three entries.

2. **`redis-check-rdb` version annotation was incorrect.** The post stated it was available in "Redis 7+" but it has been available since Redis 3.2 (when `redis-check-dump` was renamed to `redis-check-rdb`). Changed "(Redis 7+)" to "(Redis 3.2+)".

## Review Notes
- The `tail -1` approach for parsing `redis-cli CONFIG GET` output works correctly in script/pipe contexts because `redis-cli` automatically switches to raw output mode when stdout is not a TTY. In interactive mode the output includes numbering prefixes, but in piped usage (as shown) it outputs bare values.
- The BGSAVE wait loop using LASTSAVE comparison is correct and a well-known pattern.
- The post correctly notes that forward migration (older to newer RDB version) is supported but backward migration is not.
- The `min-replicas-to-write` approach in Step 4 is correctly commented out and noted as conditional on having replicas, which is appropriate.
