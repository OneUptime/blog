# Validation Summary: How to Choose Between Pipelining and Transactions in Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (pipelining, MULTI/EXEC transactions, WATCH optimistic locking)
- Python (redis-py client library)

## Sources Consulted
- redis-py source code (v7.0.1) — `Pipeline`, `execute`, `_execute_transaction`, `_execute_pipeline`, `watch`, `multi`, `reset`, `hset` methods
- Redis official documentation on transactions (MULTI/EXEC behavior, error handling, no rollback semantics)
- Redis official documentation on pipelining (round-trip reduction, batching)

## Issues Found

1. **Function name mismatch (line 91):** The function `atomic_increment_if_positive` actually performs a decrement (`pipe.decr(key)`), not an increment. Renamed to `atomic_decrement_if_positive`.

2. **Incorrect round-trip count (line 113):** The post claimed pipelining reduces round trips "from 2 (MULTI, EXEC) to 1." Without pipelining, a transaction with N commands requires N+2 round trips (MULTI + N command responses + EXEC), not 2. Changed to "from N+2 (MULTI, N commands, EXEC) to 1."

3. **Misleading error isolation claim (performance table):** The table stated transaction error isolation is "Whole-batch" with Pipeline as the winner. This is incorrect — runtime errors in Redis transactions (e.g., INCR on a string value) do NOT cause a rollback; other commands still execute and return their results. Only queuing errors (invalid syntax) abort the entire transaction. Changed the table entry to "Per-command**" with "Tie" as the winner, and added a footnote clarifying the distinction between runtime and queuing errors.

4. **Minor wording fix (footnote):** Changed "block other clients for the duration" to "block other clients during EXEC processing" for accuracy — other clients are only blocked during the atomic EXEC phase, not during the MULTI-to-EXEC queuing period.

## Review Notes
- The `pipe.multi()` call in the `transfer_points` function (line 67) is redundant when using `pipeline()` with `transaction=True` (the default), since `execute()` automatically wraps commands in MULTI/EXEC. However, it is not incorrect — it is valid redis-py API — so it was left as-is. The explicit `multi()` call is more commonly used after `WATCH` to separate the read phase from the transaction phase.
- All redis-py API usage (`pipeline()`, `hset` with `mapping`, `watch`, `reset`, `decrby`, `incrby`, `WatchError`) was verified against current source and is correct.
- The performance comparison table timings (~1ms for 100 SETs) are reasonable ballpark figures for local Redis, though actual numbers vary by hardware and network.
