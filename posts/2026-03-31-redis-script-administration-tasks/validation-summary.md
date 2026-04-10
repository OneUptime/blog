# Validation Summary: How to Script Redis Administration Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (redis-cli)
- Bash shell scripting
- Unix tools (grep, sed, sort, uniq, cut, find)

## Sources Consulted
- Redis CLI documentation: https://redis.io/docs/latest/develop/connect/cli/
- Redis BGSAVE command: https://redis.io/docs/latest/commands/bgsave/
- Redis LASTSAVE command: https://redis.io/docs/latest/commands/lastsave/
- Redis INFO command: https://redis.io/docs/latest/commands/info/
- Redis CONFIG GET command: https://redis.io/docs/latest/commands/config-get/
- Redis SCAN command: https://redis.io/docs/latest/commands/scan/
- Bash reference manual (pipelines and subshells): https://www.gnu.org/software/bash/manual/bash.html#Pipelines

## Issues Found

### 1. Health Check `grep` pattern matches multiple fields
- **What was wrong:** `grep "used_memory:"` in the `check_memory` function matched multiple INFO memory fields (e.g., `used_memory_human`, `used_memory_rss`, `used_memory_peak`), causing the `used` variable to contain multiple values and the arithmetic to fail.
- **What was changed:** Added `^` anchor to the grep pattern: `grep "^used_memory:"`.
- **Why:** Ensures only the exact `used_memory` field is matched.

### 2. Backup script LASTSAVE wait loop was logically flawed
- **What was wrong:** The while condition `[ "$(redis-cli LASTSAVE)" = "$(redis-cli LASTSAVE)" ]` compared two near-simultaneous LASTSAVE calls, which almost always return the same value. This made the condition effectively `while true`, relying entirely on the inner `rdb_bgsave_in_progress` check to break.
- **What was changed:** Captured LASTSAVE timestamp before calling BGSAVE (`BEFORE=$(redis-cli LASTSAVE)`), then compared against that stored value in the loop: `while [ "$(redis-cli LASTSAVE)" = "$BEFORE" ]`. Removed the redundant inner check.
- **Why:** This is the standard LASTSAVE polling pattern — wait until the timestamp changes from its pre-BGSAVE value, indicating the save completed.

### 3. Bulk deletion script lost counter due to subshell
- **What was wrong:** Piping `redis-cli --scan` into `while read` creates a subshell for the loop body. The `COUNT` variable was incremented inside the subshell but lost when the subshell exited, so the final echo always reported "Total deleted: 0 keys".
- **What was changed:** Replaced the pipe with process substitution: `while read ...; do ... done < <(redis-cli --scan --pattern "$PATTERN")`.
- **Why:** Process substitution runs the while loop in the current shell, preserving variable modifications.

## Review Notes
- The `-a` password flag on `redis-cli` produces a warning about password visibility on the command line. The post could mention using `REDISCLI_AUTH` environment variable as a more secure alternative, but this is a style preference, not an error.
- The `check_memory` function does not handle `maxmemory` being 0 (no limit), which would display "max: 0MB". The monitoring script handles this correctly. Not a bug per se, but a minor inconsistency.
- The bulk deletion script calls `redis-cli DEL` once per key. For very large keyspaces, batching deletes with `xargs` or `UNLINK` would be more efficient, but the current approach is correct and the post frames it as a safe pattern.
