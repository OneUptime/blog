# Validation Summary: How to Use Redis Transactions in Ruby

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (MULTI/EXEC transactions, WATCH/UNWATCH optimistic locking)
- Ruby
- redis-rb gem (v5+)
- connection_pool gem

## Sources Consulted
- redis-rb source code: `lib/redis/commands/transactions.rb` — https://github.com/redis/redis-rb/blob/master/lib/redis/commands/transactions.rb
- redis-rb source code: `lib/redis/commands/strings.rb` — https://github.com/redis/redis-rb/blob/master/lib/redis/commands/strings.rb
- redis-rb CHANGELOG.md — https://github.com/redis/redis-rb/blob/master/CHANGELOG.md (v5.0.0 breaking changes)
- redis-client gem source — https://github.com/redis-rb/redis-client
- Redis official documentation on transactions — https://redis.io/docs/interact/transactions/

## Issues Found

### 1. Incorrect SET return value in Basic MULTI/EXEC example (line 28)
- **What was wrong:** Comment showed `# [true, true, 400, 400]` as the output of the transaction results.
- **What was changed:** Corrected to `# ["OK", "OK", 400, 400]`.
- **Why:** `Redis#set` returns the string `"OK"`, not boolean `true`. Only when called with `:nx` or `:xx` options does it return `true`/`false`.

### 2. Discarding a Transaction section used removed API (lines 75-79)
- **What was wrong:** The section showed the non-block form of `multi` (`redis.multi` / `redis.set(...)` / `redis.discard`), which was deprecated in redis-rb v4.6.0 and removed in v5.0.0. Calling `multi` without a block raises a `LocalJumpError` in v5+.
- **What was changed:** Rewrote the section to use the block form. Demonstrates that raising an exception inside the `multi` block triggers DISCARD automatically.
- **Why:** The blog is written for current redis-rb usage, so it should reflect the v5+ API.

### 3. Error Behavior section inaccurately showed error handling (lines 105-116)
- **What was wrong:** The example showed the result of `multi` as `[true, Redis::CommandError, 1]`, implying the error is silently returned in the results array. In redis-rb v5+, a `Redis::CommandError` is actually raised as an exception. The `true` was also incorrect (should be `"OK"`).
- **What was changed:** Rewrote the example to use a `begin/rescue` block catching `Redis::CommandError`. Added verification that successful commands were still applied despite the error.
- **Why:** redis-rb v5 raises `CommandError` on execution-time failures rather than returning them in the array. The underlying Redis behavior (no rollback) is correctly described — only the Ruby client-side representation was wrong.

## Review Notes
- The `redis.unwatch` calls inside `watch` blocks (in the Optimistic Locking and Watching Multiple Keys sections) are technically necessary when you decide not to proceed with `multi` inside a `watch` block — the block form of `watch` only auto-unwatches on exceptions, not on normal exit without a transaction. The examples correctly use this pattern.
- The retry-with-backoff pattern is sound. The exponential backoff formula `0.01 * (2 ** attempt)` gives delays of 10ms, 20ms, 40ms for 3 retries, which is reasonable.
- The connection_pool usage is correct and idiomatic.
