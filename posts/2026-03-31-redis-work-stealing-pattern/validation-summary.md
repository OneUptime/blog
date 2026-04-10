# Validation Summary: How to Implement Work Stealing Pattern with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (LPUSH, LPOP, LLEN, LMOVE, SADD, SREM, SMEMBERS, pipeline)
- Python (`redis` library)
- Bash (redis-cli monitoring script)

## Sources Consulted
- Redis official documentation for LMOVE (https://redis.io/docs/latest/commands/lmove/) — confirmed syntax: `LMOVE source destination LEFT|RIGHT LEFT|RIGHT`, available since Redis 6.2
- Redis official documentation for RPOPLPUSH (https://redis.io/docs/latest/commands/rpoplpush/) — confirmed deprecated since Redis 6.2 in favor of LMOVE
- Redis official documentation for LPUSH, LPOP, LLEN, SADD, SREM, SMEMBERS — all confirmed correct
- Python `redis` library documentation — confirmed `r.lmove(source, dest, 'RIGHT', 'LEFT')` is the correct API

## Issues Found
- **Double-processing bug in `steal_job()` / `claim_job()`**: The original `steal_job()` used `LMOVE` to atomically move a job from the target worker's queue into the stealing worker's own queue (`MY_QUEUE`), AND returned the job data directly for immediate processing. This meant the stolen job existed in two places: (1) returned for immediate processing by the caller, and (2) still sitting in `MY_QUEUE`. On the next call to `claim_job()`, `LPOP` would retrieve that same job from `MY_QUEUE`, causing it to be processed a second time.
  - **Fix**: Restructured the two functions so that `steal_job()` only performs the `LMOVE` (returning the source worker ID instead of the job data), and `claim_job()` then `LPOP`s the stolen job from its own queue for processing. This ensures each job is processed exactly once while preserving the atomic `LMOVE` transfer and `stolen_from` tracking.

## Review Notes
- The `claim_job()` function defines a `timeout: int = 1` parameter that is never used in the function body. This is dead code but does not cause incorrect behavior.
- The `register_worker()` function calls `r.expire(WORKER_REGISTRY, 3600)` on the entire `workers:active` set. Every worker registration resets the TTL for the whole set. In production, per-worker heartbeats (e.g., using sorted sets with timestamps) would be more robust, but this is acceptable for a tutorial.
- The claim-after-steal flow (`LMOVE` then `LPOP`) has a theoretical race window: if another thread or process `LPOP`s from `MY_QUEUE` between the `LMOVE` and the subsequent `LPOP`, the stealing worker would miss the job. This is not an issue in the single-process model shown in the tutorial but would need attention in a multi-threaded deployment.
