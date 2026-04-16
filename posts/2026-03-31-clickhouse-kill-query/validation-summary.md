# Validation Summary: How to Use KILL QUERY in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (KILL QUERY statement)
- `system.processes` system table
- `clickhouse-client` CLI
- SQL
- Bash scripting

## Sources Consulted
- ClickHouse official docs — KILL Statements: https://clickhouse.com/docs/sql-reference/statements/kill
- ClickHouse source — `InterpreterKillQueryQuery.cpp` (`cancellationCodeToStatus` function): https://github.com/ClickHouse/ClickHouse/blob/master/src/Interpreters/InterpreterKillQueryQuery.cpp
- ClickHouse docs — SHOW PROCESSLIST and `system.processes`

## Issues Found

1. **Incorrect `kill_status` values throughout the post.** The original post used `SENT`, `KILLED`, and `CANT_KILL_SYSTEM` as if they were the values emitted by ClickHouse. Per the ClickHouse source (`cancellationCodeToStatus` in `InterpreterKillQueryQuery.cpp`), the actual values are `finished`, `waiting`, `pending`, `cant_cancel`, and `unknown_status`. I corrected:
   - The sample response under "Kill a Single Query by ID" now shows `waiting` instead of `SENT`, and the accompanying explanation describes `waiting` → `finished` transition.
   - The "Kill Status Values" table was rewritten with the five actual status strings and accurate meanings.

2. **Incorrect `TEST` mode sample output.** The original post claimed TEST mode emits rows with `kill_status = WOULD KILL`. In reality, TEST mode uses `CancellationCode::Unknown`, which maps to the string `unknown_status`. I updated the sample output block to use `unknown_status`.

## Review Notes

- The KILL QUERY syntax, modifier ordering (`SYNC`/`ASYNC`/`TEST`), default behavior (ASYNC), and WHERE-clause semantics against `system.processes` are all correct.
- The `SHOW PROCESSLIST` reference is correct — ClickHouse supports it as an alias for a projection of `system.processes`.
- `formatReadableSize`, `round`, and `left` functions used in the example query are all standard ClickHouse functions.
- `clickhouse-client --query "..."` invocation and `FORMAT TabSeparated` usage in the shell example are correct.
- The column list shown in sample outputs (`kill_status | query_id | user | query`) is plausible — the interpreter inserts `kill_status` at position 0 and then the remaining columns selected from `system.processes`. The author's 4-column layout is a reasonable simplification for illustration.
- Future improvement: the post could mention `KILL MUTATION` as a sibling statement and note that `KILL QUERY` only signals cooperative cancellation — some operations (e.g. certain merges, external connection reads) may not respond immediately, which is a common source of confusion.
