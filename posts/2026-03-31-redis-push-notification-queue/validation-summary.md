# Validation Summary: How to Build a Push Notification Queue with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lists, Sorted Sets, Sets)
- Python (redis-py client library)
- Push notifications (FCM/APNs conceptual)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis official command reference: https://redis.io/commands/ (RPUSH, LPOP, LLEN, SADD, SMEMBERS, SREM, ZADD, ZREM, ZRANGE, ZRANGEBYSCORE)
- redis-py changelog for deprecation of `zrangebyscore` in 4.2+: https://github.com/redis/redis-py/blob/master/CHANGES

## Issues Found

### 1. Race condition and incorrect logic in `register_token`
**What was wrong:** The function created a pipeline, queued `sadd` on it, but then called `r.smembers(key)` directly on the connection (not the pipeline). Since `pipe.execute()` hadn't been called yet, `smembers` read stale data that did not include the newly added token. This meant the token count check could be off-by-one, failing to trim when the limit was reached. Additionally, the comment referred to removing the "oldest" token, but Redis Sets are unordered — `list(all_tokens)[0]` returns an arbitrary element, not the oldest.

**What was changed:** Removed the unnecessary pipeline. The token is now added with `r.sadd()` directly, then `smembers` is called to get the updated set. The trim logic now iterates to find a token other than the just-added one to remove, and the comment correctly states the removal is arbitrary.

**Why:** Pipeline reads and writes are batched and only execute on `pipe.execute()`. Mixing pipeline writes with direct reads creates data inconsistency. Sets have no insertion ordering, so claiming to remove the "oldest" is misleading.

### 2. Deprecated `zrangebyscore` API
**What was wrong:** `r.zrangebyscore("push:processing", 0, now)` uses an API deprecated since redis-py 4.2 (2022).

**What was changed:** Replaced with `r.zrange("push:processing", 0, now, byscore=True)`.

**Why:** `zrangebyscore` has been deprecated in redis-py since version 4.2 in favor of the unified `zrange` method with `byscore=True`. For a post dated 2026, the current API should be used.

## Review Notes
- The `dequeue_push` function returns `None` when no job exists but a tuple `(job, job_data)` when a job is found. This inconsistent return type is a common Python pattern but callers must check for `None` before unpacking. Not technically wrong, but worth noting.
- The `nack_push` function always requeues failed jobs to `push:queue:normal`, even if the job was originally high-priority. This is a design choice, not a bug, but readers implementing priority queues may want to preserve the original priority.
- The pattern of using `LPOP` for dequeue is non-blocking. In production, workers would typically use `BLPOP` for blocking dequeue to avoid busy-waiting. The post doesn't mention this, but the non-blocking approach is valid for illustrative purposes.
