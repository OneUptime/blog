# Validation Summary: How to Use SHUTDOWN in Redis to Stop the Server Safely

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (server administration, SHUTDOWN command)
- redis-cli (command-line interface)
- Bash scripting (for shutdown automation)

## Sources Consulted
- Official Redis SHUTDOWN command documentation: https://redis.io/docs/latest/commands/shutdown/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis CLI documentation: https://redis.io/docs/latest/develop/connect/cli/

## Issues Found

1. **NOSAVE description was misleading (line 20)**: The original text said "Skip the RDB snapshot and exit immediately." The phrase "exit immediately" is inaccurate because NOSAVE only skips the save step; it does not skip other shutdown steps like waiting for replicas to catch up (that is what the NOW option does). Changed to: "Skip the RDB snapshot before shutting down."

2. **FORCE description was incomplete (line 22)**: The original text said "Shutdown even if AOF fsync is still in progress." According to official docs, FORCE actually ignores errors that would normally prevent shutdown, including a failed RDB save or an in-progress AOF rewrite — not just "AOF fsync." Changed to: "Ignore errors that would normally prevent shutdown, such as a failed RDB save or an in-progress AOF rewrite."

3. **Default behavior conflated save points with AOF (line 27)**: The original text said "If AOF or RDB persistence is enabled, Redis will save before exiting." This conflates two distinct mechanisms: an RDB save is triggered by configured save points, while AOF flush is a separate step. Changed to: "If RDB save points are configured, Redis will perform a blocking save before exiting. If AOF is enabled, the AOF file will be flushed to disk."

4. **"kill -9 can corrupt the RDB file" was misleading (line 104)**: Redis writes RDB snapshots to a temporary file and atomically renames it on completion, so the existing RDB file is protected from corruption. The actual risk of kill -9 is data loss for unsaved changes. Changed to: "this bypasses the graceful shutdown sequence and causes data loss for any changes since the last successful save."

## Review Notes
- The NOW, FORCE, and ABORT options were added in Redis 7.0.0. The post does not mention version requirements, which could cause confusion for users on Redis 6.x or earlier. A future update could add version notes.
- The post does not mention that SHUTDOWN can fail (e.g., if the RDB save fails) and the server will continue running. This is relevant for production scripts.
- SIGTERM and SIGINT trigger the same graceful shutdown sequence as the SHUTDOWN command, which is useful context for users relying on process managers like systemd.
- The SHUTDOWN command is not available on Redis Cloud or Redis Software (managed offerings).
