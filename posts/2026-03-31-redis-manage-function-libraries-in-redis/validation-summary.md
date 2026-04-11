# Validation Summary: How to Manage Function Libraries in Redis

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis 7.0+ (Functions API)
- Redis CLI
- Bash scripting (deployment workflow)
- Redis Cluster

## Sources Consulted
- Redis FUNCTION LIST documentation: https://redis.io/docs/latest/commands/function-list/
- Redis FUNCTION LOAD documentation: https://redis.io/docs/latest/commands/function-load/
- Redis FUNCTION DELETE documentation: https://redis.io/docs/latest/commands/function-delete/
- Redis FUNCTION STATS documentation: https://redis.io/docs/latest/commands/function-stats/
- Redis FUNCTION DUMP documentation: https://redis.io/docs/latest/commands/function-dump/
- Redis FUNCTION RESTORE documentation: https://redis.io/docs/latest/commands/function-restore/
- Redis FUNCTION FLUSH documentation: https://redis.io/docs/latest/commands/function-flush/
- Redis Functions Introduction: https://redis.io/docs/latest/develop/programmability/functions-intro/

## Issues Found

1. **Duplicate FUNCTION LIST commands with misleading comments**: The "List Loaded Libraries" section had two identical `redis-cli FUNCTION LIST` commands with different comments ("List library names only" and "Include function names"). `FUNCTION LIST` always returns both library names and function names by default. Removed the duplicate and corrected the comment to "List all libraries and their functions."

2. **Incorrect FUNCTION STATS description**: The post claimed `FUNCTION STATS` shows "memory usage and call counts." FUNCTION STATS does not return call counts — it returns running script info (if any) and engine info. Changed the description to "View running script info and engine details."

3. **Inaccurate cluster replication claim**: The post stated "Functions must be loaded on each shard in a Redis Cluster" and the summary claimed they "do not auto-replicate across the cluster topology." This is misleading — functions DO auto-replicate from masters to their replicas within each shard. They only need to be loaded on each master shard separately. Updated both the section text and summary to clarify this distinction.

4. **Inconsistent cluster section text**: The cluster section text said "Use `--cluster call` to execute on all nodes" but the code example used a manual for-loop with `--cluster info` parsing instead. Removed the `--cluster call` mention since the code example demonstrates a different (valid) approach.

## Review Notes
- All core `FUNCTION` subcommands (LIST, LOAD, DELETE, STATS, DUMP, RESTORE, FLUSH) use correct syntax for Redis 7.0+.
- The FUNCTION DUMP/RESTORE piping approach with file redirection (`> file` / `< file`) works but relies on redis-cli handling binary data correctly. In practice, using `--raw` mode or handling via RDB files may be more robust for production use.
- The deployment script is a reasonable CI/CD pattern, though quoting `$lib_file` in the `cat` command would be safer for paths with spaces.
