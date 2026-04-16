# Validation Summary: How to Fix 'Stack overflow' in Complex ClickHouse Queries

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse (server configuration, SQL, Distributed table engine)
- Recursive CTEs / Window functions
- Bash (shell script snippet)
- XML server configuration

## Sources Consulted
- ClickHouse error codes (src/Common/ErrorCodes.cpp): https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp
- ClickHouse server settings: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse per-query settings (max_parser_depth, max_ast_depth): https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse CTE docs (WITH RECURSIVE): https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse Distributed table engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- src/Common/checkStackSize.cpp (actual error message text)

## Issues Found
1. **Wrong exception code.** The post said `exception_code = 307` for `TOO_DEEP_RECURSION`. The correct code is **306** (307 is `TOO_MANY_BYTES`). Fixed the query and comment.
2. **Invalid config parameter `thread_stack_size`.** The post recommended setting `<thread_stack_size>` in `config.xml`. This is not a real ClickHouse server setting — the OS thread stack size is governed by ulimit/OS, not config.xml. Replaced the section with guidance on the actual per-query recursion limits (`max_parser_depth`, `max_ast_depth`, default 1000) that can be set via `SET` or in `users.xml` profiles. Also updated the summary accordingly.
3. **Inaccurate quoted error message.** The post quoted `DB::Exception: Stack overflow. (TOO_DEEP_RECURSION)`. ClickHouse's actual message from `checkStackSize.cpp` is `Stack size too large. Stack address: ..., frame address: ..., stack size: ..., maximum stack size: ...`, thrown with the `TOO_DEEP_RECURSION` code. Updated the quote to match what users will actually see.

## Review Notes
- `max_thread_pool_size` and `thread_pool_queue_size` are valid server settings (defaults 10000 each). They remain unchanged in Fix 1 references? — note: these were removed with the revised Fix 1 because they do not affect recursion depth; keeping the fix focused on the relevant knobs.
- `WITH RECURSIVE` is supported as of ClickHouse 24.3 and requires the new query analyzer (`enable_analyzer`, production-ready since 24.8). The post's recommendation to rewrite with window functions is still sound advice because recursive CTEs in ClickHouse are less mature and can be expensive.
- The Distributed DDL example uses `rand()` as the sharding key, which produces uneven distribution. Fine for the example's purpose (counting), but a hashed column expression like `intHash64(UserID)` is generally preferred in practice.
- Window function syntax and all `system.query_log` columns referenced are correct.
