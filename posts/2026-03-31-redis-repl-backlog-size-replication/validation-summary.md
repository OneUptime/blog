# Validation Summary: How to Configure Redis repl-backlog-size for Replication

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (replication subsystem)
- Redis CLI (`redis-cli`, `CONFIG SET`, `CONFIG GET`, `INFO`)
- Redis configuration (`redis.conf`: `repl-backlog-size`, `repl-backlog-ttl`)

## Sources Consulted
- Redis official documentation: Replication — https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis official documentation: INFO command — https://redis.io/docs/latest/commands/info/
- Redis official documentation: CONFIG SET command — https://redis.io/docs/latest/commands/config-set/
- Redis source code (`replication.c`) for log message formats

## Issues Found

1. **Partial sync success log message was incomplete.**
   - *What was wrong:* The example showed `Partial resynchronization request from 192.168.1.10:6380 accepted. Sending 2048 bytes of backlog.` but the actual Redis log message includes `starting from offset <N>` at the end.
   - *Fix:* Added `starting from offset 54321` to match the real Redis log format.

2. **Partial sync failure log message contained a fabricated field.**
   - *What was wrong:* The example included `(Replica request was: 12345, Master offset: 9999999)` but the actual Redis log only contains the replica's requested offset: `(Replica request was: 12345)`. The `, Master offset: 9999999` portion does not appear in Redis logs.
   - *Fix:* Removed the fabricated `Master offset` field from the example log message.

3. **Wrong INFO metric used for estimating write throughput.**
   - *What was wrong:* The "Calculating Write Rate" section used `instantaneous_output_kbps`, which measures all data flowing *out* of Redis (including read responses to clients). This greatly overestimates the replication stream rate for read-heavy workloads.
   - *Fix:* Changed to `instantaneous_input_kbps`, which measures incoming client traffic and is a closer approximation of the write command rate that fills the backlog. Updated the accompanying description accordingly.

## Review Notes
- The `instantaneous_input_kbps` metric is an approximation — it includes all incoming traffic (reads and writes). For a precise measurement of the replication stream growth rate, users could sample `master_repl_offset` from `INFO replication` at two points in time and compute the difference. This is a minor nuance and the blog's approach is reasonable for a quick estimate.
- All other technical claims were verified as accurate: default `repl-backlog-size` of 1 MB, `repl-backlog-ttl` default of 3600s, runtime configurability via `CONFIG SET`, circular buffer description, contiguous memory allocation, and the `sync_full`/`sync_partial_ok`/`sync_partial_err` stat fields.
- The post uses the modern "replica" terminology rather than the legacy "slave" terminology, which is correct for current Redis versions.
