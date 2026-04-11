# Validation Summary: How to Use Redis Lists in PHP for Job Queues

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lists data structure, LPUSH, RPOP, BRPOP, LMOVE, LREM, LLEN, LINDEX, LRANGE, LTRIM)
- PHP (phpredis extension)
- Job queue patterns (producer/consumer, reliable queue, dead letter queue, priority queue)

## Sources Consulted
- phpredis official documentation (https://github.com/phpredis/phpredis) — method signatures and return types for `brPop`, `lRem`, `lPush`, `rPop`, `lMove`, `lLen`, `lIndex`, `lRange`, `lTrim`
- Redis official documentation (https://redis.io/docs/latest/commands/) — LMOVE, BRPOP, LREM command specifications

## Issues Found

### 1. `brPop` timeout return value (Blocking Pop section)
- **What was wrong:** The timeout check used `$result === null`, but phpredis `brPop` returns `false` on timeout, not `null`. This meant the timeout would never be caught, and `false` would flow into the array destructuring `[$queueName, $payload] = $result`, causing a runtime error.
- **What was changed:** Changed `$result === null` to `$result === false`.
- **Why:** The phpredis documentation specifies `brPop` returns `array|false` — an array `[key, value]` on success, or `FALSE` on timeout.

### 2. `lRem` parameter order (Reliable Queue section)
- **What was wrong:** The call was `$redis->lRem($processingQueue, 1, json_encode($job))`, passing `1` (the count) as the second argument and the value as the third. The phpredis `lRem` method signature is `lRem($key, $value, $count)` — value before count.
- **What was changed:** Reordered to `$redis->lRem($processingQueue, json_encode($job), 1)`.
- **Why:** Note that the phpredis parameter order (`$key, $value, $count`) differs from the raw Redis command (`LREM key count element`). This is a common source of confusion. With the original code, `1` would be treated as the value to search for and the JSON string would be cast to an integer for the count, so the removal would never match the intended element.

## Review Notes
- The `lMove` method used in the reliable queue section requires Redis 6.2+ and phpredis 6.0+. This version requirement is not mentioned in the post. Authors may want to note this or provide the deprecated `rpoplpush` as a fallback for older environments.
- The FIFO queue pattern (LPUSH + RPOP) is correctly implemented throughout the post.
- The priority queue pattern using `brPop` with an ordered array of keys is a well-known Redis pattern and is correctly explained.
- The dead letter queue correctly uses `lTrim` to cap the list size after each push.
