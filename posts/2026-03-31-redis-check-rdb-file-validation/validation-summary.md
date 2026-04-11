# Validation Summary: How to Use redis-check-rdb for RDB File Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (7.0+)
- redis-check-rdb utility
- RDB (Redis Database) snapshot format
- Bash scripting for backup validation pipelines
- xxd for binary file inspection

## Sources Consulted
- Redis official documentation for SAVE, BGSAVE, LASTSAVE commands: https://redis.io/docs/latest/commands/bgsave/
- Redis RDB file format specification and AUX field documentation: https://github.com/redis/redis/blob/unstable/src/rdb.h
- redis-check-rdb source and behavior (integrated into redis-server in 7.0+): https://github.com/redis/redis/blob/unstable/src/redis-check-rdb.c
- Redis configuration documentation for save directives: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- RDB version history across Redis releases (RDB v10 in 7.0, v11 in 7.2)

## Issues Found
No technical issues found.

## Review Notes
- The `date -d @timestamp` command shown in the "Inspecting RDB File Metadata" section is GNU/Linux-specific. On macOS/BSD, the equivalent is `date -r <timestamp>`. Since Redis servers typically run on Linux, this is contextually appropriate but readers on macOS should be aware.
- The ctime timestamp `1711843200` in the metadata example corresponds to approximately March 31, 2024, while the backup filename references 2026. This is a cosmetic inconsistency in the illustrative example, not a technical error.
- The comment "REDIS0011 means RDB version 11 (Redis 7.x)" is a simplification — RDB version 11 was specifically introduced in Redis 7.2, while Redis 7.0 uses RDB version 10. The parenthetical "(Redis 7.x)" is not incorrect but could be more precise.
- The bash scripts check for "Checksum OK" via grep, which works but checking the exit code of `redis-check-rdb` directly (returns 0 on success, non-zero on failure) would be a more robust alternative.
- In Redis 7.0+, `redis-check-rdb` is implemented as a mode of `redis-server` (invoked via symlink or multi-call binary). The command-line usage remains the same, so the post's examples are correct.
