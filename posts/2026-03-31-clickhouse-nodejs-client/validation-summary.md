# Validation Summary: How to Use ClickHouse Node.js Client

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (analytical database)
- Node.js
- TypeScript
- `@clickhouse/client` official npm package
- Express.js (integration example)

## Sources Consulted
- Official `@clickhouse/client` npm package: https://www.npmjs.com/package/@clickhouse/client
- Official GitHub repository: https://github.com/ClickHouse/clickhouse-js
- ClickHouse JS client README and API documentation in the repo
- TypeScript type definitions in `@clickhouse/client` package source

## Issues Found

1. **Deprecated `host` option replaced with `url`**: The `host` configuration option was deprecated in `@clickhouse/client` v1.0.0 in favor of `url`. Both occurrences (Basic Connection and Express.js Integration sections) were changed from `host` to `url`. The old option still works as an alias but logs a deprecation warning and will be removed in v2.0.0.

2. **Incorrect streaming-to-file pattern**: The "Stream Large Query Results" section used `result.stream()` from `client.query()` piped to a file via `pipeline()`. However, `result.stream()` emits `Row[]` objects (parsed data), not raw bytes, so piping it directly to a `WriteStream` would not produce valid JSONL output. Replaced with `client.exec()` which returns a raw byte stream suitable for piping to a file, following the pattern from the official examples.

3. **Unused import removed**: The "Stream Insert from a File" section imported `Transform` from `node:stream` but never used it. Removed the unused import.

4. **Incorrect generic type parameter for JSONCompactEachRow**: The `result.json<T>()` method returns `T[]` for streamable JSON formats, where `T` is the row type. The blog incorrectly used `result.json<[number, string, string][]>()` which would produce `[number, string, string][][]`. Fixed to `result.json<[number, string, string]>()` so the return type is correctly `[number, string, string][]`.

## Review Notes
- The `keep_alive: { enabled: true }` setting in the Basic Connection example is redundant since `enabled` defaults to `true`, but it serves a documentation purpose by making the default explicit, so it was left as-is.
- ClickHouse returns all numeric types as strings in JSONEachRow format. The post correctly types `user_id`, `event_count`, and `cnt` as `string` in the query result types, which is accurate.
- The `for await` streaming pattern shown in "Stream Row-by-Row Processing" works correctly but has ~2x overhead compared to event-based `stream.on('data', ...)` according to the official docs. This is a performance consideration, not a correctness issue, so no change was made.
