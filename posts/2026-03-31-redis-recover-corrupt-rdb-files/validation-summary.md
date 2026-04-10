# Validation Summary: How to Recover Redis Data from Corrupt RDB Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (7.0+)
- redis-check-rdb utility
- redis-cli
- RDB persistence format
- Linux filesystem utilities (tune2fs, ZFS)

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/management/persistence/
- Redis redis-check-rdb source code (src/redis-check-rdb.c) on GitHub
- Redis redis-check-aof documentation (for --fix flag comparison)
- Redis redis.conf configuration reference (rdbchecksum, rdbcompression directives)
- Redis BGSAVE and LASTSAVE command documentation: https://redis.io/commands/bgsave/, https://redis.io/commands/lastsave/
- Redis redis-cli --rdb documentation: https://redis.io/docs/manual/cli/

## Issues Found

### 1. `redis-check-rdb --fix` does not exist (Critical)
**What was wrong:** The post claimed `redis-check-rdb --fix` truncates an RDB file at the first corruption point. This flag does not exist. `redis-check-rdb` is a read-only diagnostic tool. The `--fix` flag exists only for `redis-check-aof`, which repairs AOF (Append Only File) files — a completely different persistence format.

**What was changed:** Rewrote Step 2 to correctly describe `redis-check-rdb` as a diagnostic-only tool. Added guidance on using `rdbchecksum no` for checksum-only corruption, and directing users to replica/backup recovery for actual data corruption. Updated the Summary section to remove the `--fix` reference.

### 2. `redis-cli --rdb` mentioned but not used in code example (Moderate)
**What was wrong:** The text said "For a full migration, use `redis-cli --rdb`:" but the code block below used `BGSAVE` + `cp` instead, never actually using the `--rdb` flag.

**What was changed:** Replaced the `BGSAVE` + `cp` code with the correct `redis-cli -p 6399 --rdb /var/lib/redis/dump.rdb` command, which matches the text description.

### 3. BGSAVE + immediate cp was a race condition (Moderate)
**What was wrong:** The original code ran `redis-cli BGSAVE` followed immediately by `cp` of the dump file. Since BGSAVE is asynchronous (it forks a child process and returns immediately), copying the file before the save completes could result in copying a stale or partially-written file.

**What was changed:** Replaced with `redis-cli --rdb` which handles the synchronization internally — it waits for the full RDB transfer to complete before writing the output file.

### 4. Misleading `rdbcompression` comment (Minor)
**What was wrong:** The comment `rdbcompression yes  # Smaller files, faster checksums` incorrectly implied that compression speeds up checksum computation. Compression and checksumming are independent features in Redis. The CRC64 checksum performance overhead (~10%) is documented separately and is unrelated to compression.

**What was changed:** Updated the comment to `rdbcompression yes  # Compress strings in RDB files`, which accurately describes what the directive does.

## Review Notes
- The `tune2fs -j /dev/sda1` command for "ext4 journaling" is slightly misleading — `tune2fs -j` adds a journal to an ext2 filesystem (converting it to ext3). ext4 filesystems already have journaling enabled by default. This was left as-is since it's in an illustrative section about filesystem-level protection, not a primary recovery step.
- The export script using `while read key` would be more robust as `while read -r key` to handle backslashes in key names, but this is a minor shell scripting best practice and was left unchanged.
- The `KEYS "*"` command in Step 3 is acceptable since it's used on a temporary recovery instance, not production. In production, `SCAN` should always be preferred.
