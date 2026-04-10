# Validation Summary: What Is Redis Pipelining and How It Differs from Batching

## Status
validated

## Post Type
Technical explainer / comparison guide

## Technologies Covered
- Redis pipelining
- Redis MULTI/EXEC transactions
- Redis Lua scripting (EVAL)
- redis-py (Python Redis client)
- redis-benchmark CLI tool

## Sources Consulted
- Redis official documentation on pipelining: https://redis.io/docs/latest/develop/use/pipelining/
- Redis official documentation on transactions: https://redis.io/docs/latest/develop/interact/transactions/
- Redis official documentation on Lua scripting (EVAL): https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- redis-benchmark documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/

## Issues Found

### 1. Incorrect MULTI/EXEC round-trip count in comparison table
- **What was wrong:** The table stated MULTI/EXEC requires "2 (MULTI+EXEC)" round-trips. This is incorrect. Without pipelining, MULTI/EXEC requires N+2 round-trips: 1 for MULTI (returns OK), 1 for each of the N queued commands (each returns QUEUED), and 1 for EXEC (returns all results).
- **What was changed:** Updated the table cell from "2 (MULTI+EXEC)" to "N+2 (MULTI + N commands + EXEC)".
- **Why:** The original value was misleading, suggesting only 2 round-trips were needed regardless of the number of commands, when in reality each queued command also requires its own round-trip to receive the QUEUED acknowledgment.

### 2. Incorrect MULTI/EXEC error handling description in comparison table
- **What was wrong:** The table stated MULTI/EXEC error handling is "Whole block". This is incorrect. Redis explicitly does not support transaction rollbacks. Per the Redis documentation: "Even when a command fails, all the other commands in the queue are processed — Redis will not stop the processing of commands." Only queue-time errors (syntax errors detected before EXEC) cause the whole transaction to be discarded.
- **What was changed:** Updated the table cell from "Whole block" to "Per command (no rollback)".
- **Why:** The original description would lead readers to believe MULTI/EXEC behaves like SQL transactions with rollback semantics, which is a common and dangerous misconception. Runtime errors within EXEC are handled per-command, and other commands continue to execute.

## Review Notes
- The post correctly notes that MULTI/EXEC "guarantees atomicity" which is consistent with Redis's own terminology — atomicity here means serialized execution (no interleaving from other clients), not all-or-nothing semantics as in SQL databases. This is a subtle but important distinction that the post could clarify in a future revision.
- The Python code examples use correct redis-py API calls. The `transaction=False` and `transaction=True` parameters for `pipeline()` are accurate.
- The redis-benchmark flags (`-t`, `-n`, `-P`) are all correct and current.
- The Lua EVAL example is correct: `numkeys=2` matches the two key arguments, and the Lua `if v then` correctly handles Redis nil (mapped to Lua `false`).
- The "5-10x throughput improvement" claim is consistent with figures cited in Redis's own pipelining documentation.
