# Validation Summary: How to Estimate Redis RDB File Size Before Snapshot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (RDB persistence, BGSAVE, memory management)
- Bash scripting (disk space monitoring, key type analysis)
- Linux CLI tools (df, du, bc, awk)

## Sources Consulted
- Redis official documentation for INFO command (memory and persistence sections) — https://redis.io/docs/latest/commands/info/
- Redis source code (`src/object.c`) for `OBJ_ENCODING_EMBSTR_SIZE_LIMIT` (44 bytes)
- Redis configuration documentation for `rdbcompression` default (LZF enabled by default) — https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis persistence documentation (temporary RDB file behavior during BGSAVE) — https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

## Issues Found
1. **Misleading section title**: The section "Using DEBUG RELOAD for Exact Measurement" did not use the `DEBUG RELOAD` command at all — the code used `BGSAVE`. `DEBUG RELOAD` is a separate Redis command that saves and reloads the dataset. Renamed the section to "Triggering BGSAVE for Exact Measurement".

2. **Incorrect unit for embstr threshold**: The compression table listed "Small strings (< 44 chars)" but the Redis embstr encoding limit (`OBJ_ENCODING_EMBSTR_SIZE_LIMIT`) is 44 **bytes**, not characters. For multi-byte UTF-8 strings, bytes and characters differ. Changed "chars" to "bytes".

3. **Imprecise grep pattern**: `redis-cli INFO memory | grep used_memory_dataset` (line 53) would also match `used_memory_dataset_perc`, potentially returning two lines. Added a trailing colon to the grep pattern (`grep used_memory_dataset:`) to match only the intended field. The other two occurrences of this grep (lines 60 and 129) already had the colon.

## Review Notes
- The key type scanning script (counting keys by type) is functional but very inefficient — it issues a separate `redis-cli TYPE` call for each key. For large datasets, `redis-cli --scan` combined with a pipeline or `OBJECT HELP` would be faster. This is a performance concern, not a correctness issue.
- The `du -b` and `df -B1` flags are Linux-specific (GNU coreutils). They won't work on macOS. Since Redis servers typically run on Linux, this is acceptable but worth noting.
- The BGSAVE wait loop has a minor theoretical race condition (if BGSAVE completes before the first check, the loop exits immediately), but this is harmless — it means the save already finished.
