# Validation Summary: How to Use FT.CURSOR READ in Redis for Paginated Aggregations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RediSearch / Redis Stack module)
- RediSearch FT.AGGREGATE with cursor pagination
- RediSearch FT.CURSOR READ / FT.CURSOR DEL commands
- RediSearch FT.CONFIG for cursor timeout configuration
- Python redis-py client library

## Sources Consulted
- Redis Stack documentation for FT.AGGREGATE (https://redis.io/docs/latest/commands/ft.aggregate/)
- Redis Stack documentation for FT.CURSOR READ (https://redis.io/docs/latest/commands/ft.cursor-read/)
- Redis Stack documentation for FT.CURSOR DEL (https://redis.io/docs/latest/commands/ft.cursor-del/)
- Redis Stack documentation for FT.CONFIG (https://redis.io/docs/latest/commands/ft.config-set/)
- redis-py client library documentation and source code for execute_command behavior

## Issues Found

### 1. Incorrect `execute_command` usage for `FT.CURSOR READ`
**What was wrong:** Both Python examples passed `'FT.CURSOR READ'` as a single string argument to `execute_command()`. In redis-py, `execute_command()` sends each argument as a separate RESP protocol bulk string. Sending `"FT.CURSOR READ"` as one token means Redis receives a single command name with a space in it, which it cannot recognize. The actual command is `FT.CURSOR` with `READ` as the first argument (subcommand).

**What was changed:** Split `'FT.CURSOR READ'` into two separate arguments: `'FT.CURSOR', 'READ'` in both the main cursor iteration example and the error handling example.

**Why:** Without this fix, the code would raise a `redis.exceptions.ResponseError` with "unknown command 'FT.CURSOR READ'" at runtime.

### 2. Missing count skip in response parsing
**What was wrong:** `FT.AGGREGATE` responses include a result count as the first element of the results array (format: `[count, row1, row2, ...]`). The code used `response[0]` directly to collect results, which includes the integer count. When later iterating and calling `dict(zip(row[::2], row[1::2]))`, encountering an integer (the count) instead of a list (a result row) would raise a `TypeError`.

**What was changed:** Changed `response[0]` to `response[0][1:]` in all four locations across both Python examples (initial response parsing and cursor read response parsing in both examples).

**Why:** Without this fix, the code would crash with a `TypeError` when trying to slice an integer, or produce incorrect results by including the count integer in the result list.

## Review Notes
- The CLI command syntax and examples (FT.CREATE, HSET, FT.AGGREGATE with WITHCURSOR, FT.CURSOR READ, FT.CURSOR DEL, FT.CONFIG GET/SET) are all correct.
- The response format shown in the text examples omits the result count integer that is the first element of the aggregate results array. This is a common simplification in tutorials but could confuse readers trying to parse responses manually. The Python code fixes address this discrepancy.
- The CURSOR_MAX_IDLE default of 300000ms (300 seconds) is correct.
- The explanation that cursor ID 0 means iteration is complete is correct.
- The note that COUNT in FT.CURSOR READ can differ from the original WITHCURSOR COUNT is correct.
- The error handling pattern checking for 'Cursor not found' in the exception message is a reasonable approach for production code.
