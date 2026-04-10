# Validation Summary: How RDB Snapshots Work in Redis Step by Step

## Status
validated

## Post Type
Tutorial / Technical deep-dive

## Technologies Covered
- Redis (RDB persistence mechanism)
- Linux copy-on-write (fork semantics)
- POSIX filesystem atomicity (rename)

## Sources Consulted
- [Redis INFO command documentation](https://redis.io/docs/latest/commands/info/) — verified field names and sections for `rdb_current_bgsave_time_sec`, `latest_fork_usec`, `rdb_last_cow_size`, `rdb_last_save_time`, `rdb_last_bgsave_status`, `rdb_last_bgsave_time_sec`
- [Redis RDB file format specification](https://rdb.fnordig.de/file_format.html) — verified magic header, CRC64 checksum placement, expiry time encoding, and RDB version numbering
- [Redis source: rdb.c](https://github.com/redis/redis/blob/unstable/src/rdb.c) — verified loading order (header, data, then checksum)
- [Redis source: rdb.h (7.2 branch)](https://github.com/redis/redis/blob/7.2/src/rdb.h) — confirmed RDB_VERSION 11 for Redis 7.2+
- [Redis RDB version history](https://rdb.fnordig.de/version_history.html) — confirmed version 10 for Redis 7.0, version 11 for Redis 7.2

## Issues Found
1. **Step 8 — Incorrect CRC64 checksum verification order**: The post originally listed "Verifies the CRC64 checksum" as step 2 (before loading data) and "Loads all key-value pairs into memory in bulk" as step 3. This is backwards. The CRC64 checksum is appended at the end of the RDB file (after the EOF opcode), so it can only be verified after all data has been read. Redis computes the checksum incrementally during loading and compares it against the stored value at the end. Fixed the ordering to: load data first, then verify checksum.

2. **Step 8 — Expiry times described as a separate loading phase**: The post listed "Sets TTLs for keys with expiry times" as a distinct step after loading key-value pairs. In the RDB format, expiry times are stored inline immediately before their associated key-value pair (using opcode `0xFC` for millisecond timestamps or `0xFD` for second timestamps). They are loaded together with the key data, not as a separate pass. Merged this into the data loading step with a clarifying note.

## Review Notes
- The `REDIS0011` header is accurate for Redis 7.2+. Readers using Redis 7.0 would see `REDIS0010` instead. The post does not specify a Redis version, which is fine since it describes general behavior.
- The "8-15 seconds for 10 GB" loading estimate is a reasonable ballpark but varies significantly based on hardware, data structure complexity, and whether the dataset uses many small keys or fewer large ones.
- The fork latency example of 25ms for a 10 GB instance is plausible but depends heavily on the OS, kernel version, and whether Transparent Huge Pages are enabled.
