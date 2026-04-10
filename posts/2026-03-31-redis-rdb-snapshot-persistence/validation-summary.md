# Validation Summary: How to Configure Redis Persistence with RDB Snapshots

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (RDB persistence mechanism)
- Redis CLI commands (BGSAVE, SAVE, LASTSAVE, INFO persistence)
- redis.conf configuration directives (save, dbfilename, dir, rdbcompression, rdbchecksum, appendonly)
- redis-check-rdb utility

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/latest/operate/oss_and_bss/management/persistence/
- Redis official documentation on CONFIG SET: https://redis.io/docs/latest/commands/config-set/
- Redis official documentation on BGSAVE: https://redis.io/docs/latest/commands/bgsave/
- Redis official documentation on SAVE: https://redis.io/docs/latest/commands/save/
- Redis official documentation on LASTSAVE: https://redis.io/docs/latest/commands/lastsave/
- Redis official documentation on INFO: https://redis.io/docs/latest/commands/info/
- Redis redis.conf example file: https://github.com/redis/redis/blob/unstable/redis.conf
- Redis official documentation on rdb-del-sync-files: https://redis.io/docs/latest/operate/oss_and_bss/management/replication/

## Issues Found

### Issue 1: Incorrect flag for handling corrupt RDB files
- **What was wrong:** The post claimed `redis-server --rdb-del-sync-files no` could be used to force Redis to ignore a corrupt RDB file. The `rdb-del-sync-files` option actually controls whether RDB files used during replication sync are automatically deleted — it is completely unrelated to corrupt file handling.
- **What was changed:** Replaced the incorrect command with `redis-check-rdb --fix /var/lib/redis/dump.rdb`, which is the correct built-in tool for checking and repairing corrupt RDB files. Also updated the surrounding text from "force Redis to ignore a corrupt RDB" to "check and repair a corrupt RDB file using the built-in tool."
- **Why:** The original advice was misleading and would not help a user dealing with a corrupt RDB file.

### Issue 2: Redundant and unclear "Disable automatic RDB saves" section
- **What was wrong:** The section showed two identical `save ""` code blocks — one with no context and one labeled "Or in redis.conf:". The first block was presumably meant to show the runtime CLI approach, but used the config-file syntax instead of the correct CLI command.
- **What was changed:** Changed the first code block to show the runtime CLI command `CONFIG SET save ""` with a clarifying label "At runtime via CLI:".
- **Why:** This distinguishes the two methods (runtime vs. config file) and gives the correct CLI syntax for disabling RDB saves at runtime.

## Review Notes
- The default save intervals shown in the "Enabling RDB-Only Persistence" section (`save 900 1`, `save 300 10`, `save 60 10000`) match the traditional Redis defaults but differ from the ones in the "Configuring Save Intervals" section (`save 3600 1`, `save 300 100`, `save 60 10000`). Both sets are valid configurations; the first section demonstrates custom intervals while the second shows legacy defaults. This is not an error but could be clarified in future revisions.
- The `rdb_saves` field in the INFO persistence output was added in Redis 7.0. If readers are using older versions, this field will not appear. This is not incorrect but is version-dependent.
- All other technical claims (fork-based snapshotting, copy-on-write semantics, LZF compression, CRC64 checksum, OR evaluation of save rules, AOF priority on restart when both are enabled) are accurate.
