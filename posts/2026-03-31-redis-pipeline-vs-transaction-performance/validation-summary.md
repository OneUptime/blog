# Validation Summary: How to Use Redis Pipeline vs Transaction for Performance

## Status
validated

## Post Type
Tutorial / Comparison Guide

## Technologies Covered
- Redis (pipelines, MULTI/EXEC transactions, WATCH optimistic locking)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation on Pipelining: https://redis.io/docs/latest/develop/use/pipelining/
- Redis official documentation on Transactions: https://redis.io/docs/latest/develop/interact/transactions/
- redis-py documentation and source code for Pipeline class, `transaction` parameter, and WATCH usage patterns

## Issues Found
1. **WATCH example used wrong object for GET after WATCH** (line 107): The code used `r.get("balance:alice")` (the base Redis client) instead of `pipe.get("balance:alice")` (the pipeline object). After calling `pipe.watch()`, the pipeline enters immediate execution mode, and reads should be performed through `pipe` to stay on the same connection. Using `r.get()` goes through a separate connection, which is not the idiomatic redis-py WATCH pattern and can introduce a subtle race condition between the WATCH and the read. Fixed to `pipe.get("balance:alice")`.

## Review Notes
- The claim "All commands in the block succeed or none do (on errors, not on runtime failures)" is technically correct but could be clearer. Redis discards the entire transaction on queueing/syntax errors (since Redis 2.6.5+), but runtime errors (e.g., INCR on a string value) do NOT roll back the transaction -- other commands still execute. The parenthetical clarifies this sufficiently.
- The WATCH example does not handle the case where `current < 100` (insufficient balance) -- the loop would retry indefinitely. This is acceptable for a demonstration of the WATCH pattern but would need a `break` or `return` for production use.
- The 5-10x speedup claim for pipelines is a reasonable ballpark for network-bound workloads, though actual results vary with network latency and command complexity.
- All Python code uses current, non-deprecated redis-py APIs.
