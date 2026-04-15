# Validation Summary: How to Use One Format for Single-Value Output in ClickHouse

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (query output formats)
- Shell scripting (bash)
- Kubernetes (liveness probes)
- HTTP interface for ClickHouse

## Sources Consulted
- ClickHouse official formats documentation: https://clickhouse.com/docs/interfaces/formats
- ClickHouse One format dedicated page: https://clickhouse.com/docs/interfaces/formats/One
- ClickHouse RawBLOB format documentation: https://clickhouse.com/docs/interfaces/formats/RawBLOB

## Issues Found
The entire blog post is based on a fundamental misunderstanding of the ClickHouse `One` format. **Every technical claim in the post is incorrect.**

1. **`One` is an input-only format, not an output format.** The official ClickHouse formats table marks `One` as Input: yes, Output: no. It cannot be used in `SELECT ... FORMAT One` queries.

2. **The actual purpose of `One` is completely different.** Per the official docs: "The One format is a special input format that doesn't read any data from file, and returns only one row with column of type UInt8, name dummy and value 0 (like the system.one table). Can be used with virtual columns _file/_path to list all files without reading actual data." Example: `SELECT _file FROM file('path/to/files/data*', One);`

3. **Every code example would fail.** All SQL queries using `FORMAT One` for output (e.g., `SELECT count() FROM events FORMAT One`) would produce an error because `One` is not registered as an output format.

4. **All shell script examples are non-functional.** The `clickhouse-client --query "... FORMAT One"` commands would all fail.

5. **The HTTP interface example is incorrect.** `curl -s "http://localhost:8123/?query=SELECT+1+FORMAT+One"` would return an error.

6. **Claims about trailing newline behavior are fabricated.** Since `One` cannot produce output, claims about it producing values with no trailing newline are baseless.

7. **Claims about silently dropping extra rows/columns are fabricated.** This behavior does not apply to an input-only format.

8. **The comparison table is incorrect.** The `One` row in the format comparison table describes non-existent behavior.

The format that most closely matches the described behavior would be `RawBLOB`, which is both an input and output format that outputs data with no escaping, no delimiters, and no trailing newline. However, correcting this post would require a complete rewrite of the title, all content, and all examples — far beyond fixing individual technical errors.

## Review Notes
This post should be removed or completely rewritten. The `One` format does exist in ClickHouse, but it serves an entirely different purpose (input-only file listing). A post about single-scalar output from ClickHouse could be valuable, but it should reference `RawBLOB` or `TabSeparatedRaw` instead, or simply note that `TabSeparated` with a single-row single-column query is the standard approach for shell scripting use cases.
