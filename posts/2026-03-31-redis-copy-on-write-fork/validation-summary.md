# Validation Summary: How Redis Copy-on-Write Works During Fork

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- Redis (BGSAVE, BGREWRITEAOF, fork-based persistence)
- Linux copy-on-write (COW) memory management
- Linux transparent huge pages (THP)
- Redis CLI (INFO command sections: memory, persistence, stats)

## Sources Consulted
- Redis INFO command documentation — https://redis.io/docs/latest/commands/info/
- Redis WAIT command documentation — https://redis.io/docs/latest/commands/wait/
- Redis CLIENT PAUSE command documentation — https://redis.io/docs/latest/commands/client-pause/
- Redis persistence documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis latency diagnostics — https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/
- Linux kernel documentation on transparent huge pages

## Issues Found

1. **Incorrect INFO section and field name (line 41):** The command `redis-cli INFO memory | grep -E "used_memory_rss|rdb_changes"` had two errors: `rdb_changes` is not a valid Redis field (the correct name is `rdb_changes_since_last_save`), and that field lives in the `persistence` section, not `memory`. Fixed to `redis-cli INFO | grep -E "used_memory_rss|rdb_changes_since_last_save"` which queries all sections and uses the correct field name.

2. **Misleading save config comment (lines 60-63):** The comment said "save at 2am daily with fewer active writes" but `save ""` disables all automatic RDB snapshots entirely — it does not schedule anything. Fixed the comment to accurately describe that `save ""` disables automatic saves, with a note to use a cron job for scheduled BGSAVE calls.

3. **Incorrect use of WAIT command (lines 65-69):** The post recommended "Use WAIT to quiesce replicas before a manual save" but WAIT is a replication command that blocks until replicas acknowledge preceding writes — it has nothing to do with reducing COW overhead during BGSAVE. Replaced with `CLIENT PAUSE` which actually pauses client traffic briefly, reducing writes during the snapshot window.

4. **Exaggerated page table size claim (line 81):** The text said "the page table can be gigabytes in size" but the immediately following calculation showed ~100MB for a 50GB dataset. Changed "gigabytes" to "hundreds of megabytes" to match the math.

## Review Notes
- The core explanation of copy-on-write mechanics, fork behavior, and COW monitoring is solid and accurate.
- The `rdb_last_cow_size` and `aof_last_cow_size` fields are available since Redis 4.0+; earlier versions don't report them. The post doesn't mention version requirements but this is a minor omission given how old Redis 4.0 is at this point.
- The page count calculation uses ~12.5 million for 50GB/4KB; the exact figure is ~13.1 million. This is a minor rounding difference and acceptable for an illustrative example.
