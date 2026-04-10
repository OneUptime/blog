# Validation Summary: How to Use SAVE in Redis to Force a Synchronous Save

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (SAVE, BGSAVE, LASTSAVE, SHUTDOWN commands)
- RDB persistence / snapshotting
- Redis server administration

## Sources Consulted
- Redis SAVE command reference: https://redis.io/docs/latest/commands/save/
- Redis BGSAVE command reference: https://redis.io/docs/latest/commands/bgsave/
- Redis SHUTDOWN command reference: https://redis.io/docs/latest/commands/shutdown/
- Redis LASTSAVE command reference: https://redis.io/docs/latest/commands/lastsave/
- Redis INFO command reference (persistence section): https://redis.io/docs/latest/commands/info/
- Redis configuration reference (redis.conf for 7.0/7.2): https://redis.io/docs/latest/operate/oss_and_stack/management/config/

## Issues Found

### 1. Non-existent config directive `shutdown-save-on-empty-config`
- **What was wrong:** The post referenced a redis.conf directive `shutdown-save-on-empty-config yes`, claiming it controls whether Redis saves on shutdown when no `save` rules are configured. This directive does not exist in any Redis version.
- **What was changed:** Replaced with a reference to the real config directives `shutdown-on-sigint` and `shutdown-on-sigterm`, which can be set to `save` to ensure an RDB save on shutdown regardless of whether `save` rules are configured.
- **Why:** The original claim would confuse readers trying to find or set this option in their redis.conf. The actual directives (`shutdown-on-sigint`, `shutdown-on-sigterm`) were introduced in Redis 7.0 and provide the equivalent functionality.

### 2. Incorrect code block language for log output
- **What was wrong:** The Redis log line example used ` ```json ` as the code fence language, but the content is a plain Redis server log line, not JSON.
- **What was changed:** Changed the code fence language from `json` to `text`.
- **Why:** Marking it as JSON would cause syntax highlighting errors and mislead readers into thinking Redis logs are JSON-formatted (they are not by default).

## Review Notes
- All other technical claims are accurate: SAVE blocks the event loop, returns OK, BGSAVE forks a child process, LASTSAVE returns a Unix timestamp, and the INFO persistence fields (`rdb_last_bgsave_status`, `rdb_last_save_time`, `rdb_bgsave_in_progress`) are all real.
- The SAVE vs BGSAVE comparison table is accurate including the copy-on-write distinction.
- The `SHUTDOWN SAVE` command usage is correct per official docs.
- The `redis-cli --latency` monitoring suggestion is valid.
- The mermaid sequence diagram accurately represents the blocking behavior.
