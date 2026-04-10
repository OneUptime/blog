# Validation Summary: How to Troubleshoot Redis High Latency

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (server and CLI)
- Redis SLOWLOG, LATENCY, INFO, SCAN commands
- Redis persistence (RDB, AOF)
- Redis active defragmentation
- Linux system tuning (Transparent Huge Pages, vm.swappiness, swap)

## Sources Consulted
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis SLOWLOG command documentation: https://redis.io/docs/latest/commands/slowlog-get/
- Redis latency monitoring documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/
- Redis latency diagnosis guide: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

## Issues Found

### 1. Misleading comment for `mem_allocator` in Step 7
- **What was wrong:** The comment said "Check if system is under memory swap pressure (causes huge latency)" but `redis-cli INFO memory | grep mem_allocator` only shows which memory allocator Redis is using (e.g., jemalloc), not swap pressure. The swap check is performed by the subsequent `/proc` command.
- **What was changed:** Updated the comment to "Check which memory allocator Redis is using (jemalloc recommended)" and moved the latency warning to the actual swap check line below it.
- **Why:** The original comment was misleading — readers would expect to see swap information from this command but would only see the allocator name.

### 2. Broken latency monitoring script
- **What was wrong:** The monitoring script had two bugs:
  1. `redis-cli --latency-history -i 1` runs continuously and never exits, so piping to `tail -1` would hang indefinitely waiting for EOF.
  2. `awk '{print $NF}'` would capture the word "range" (the last token in the output line `min: 0, max: 1, avg: 0.19 (96 samples) -- 1.01 seconds range`), not the average latency value.
- **What was changed:** Added `timeout 2` to terminate the redis-cli process after 2 seconds, and changed `awk '{print $NF}'` to `awk '{print $6}'` which correctly extracts the average latency value (field 6 in the output).
- **Why:** Without these fixes, the script would hang on the first iteration and never produce output. Even if it somehow produced output, it would report the string "range" instead of a latency number.

## Review Notes
- The SLOWLOG output format comment mentions 5 fields `[id, timestamp, microseconds, command, client_info]` but the example only shows 4. Since Redis 4.0, SLOWLOG entries have 6 fields (adding client address and client name). This is a minor inconsistency but doesn't affect usability.
- The `vm.swappiness=0` recommendation is correct but worth noting it does not completely disable swap on modern Linux kernels — it minimizes swapping but the kernel may still swap under extreme memory pressure. Using `swapoff -a` would fully disable it.
- The `/etc/rc.local` approach for persisting THP settings is functional but considered legacy on modern systemd-based distributions. A systemd unit or tmpfiles.d configuration would be the more modern approach.
- All Redis commands and CONFIG parameters are syntactically correct and current.
- The grep patterns for INFO fields use substring matching, which correctly matches the full field names (e.g., `rdb_last_bgsave_time` matches `rdb_last_bgsave_time_sec`).
