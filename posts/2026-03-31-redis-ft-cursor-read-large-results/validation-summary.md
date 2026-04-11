# Validation Summary: How to Use FT.CURSOR READ in Redis for Large Search Results

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (Redis Search module)
- FT.CURSOR READ command
- FT.AGGREGATE command with WITHCURSOR
- FT.CURSOR DEL command
- FT.CREATE command

## Sources Consulted
- Redis official docs: FT.CURSOR READ — https://redis.io/docs/latest/commands/ft.cursor-read/
- Redis official docs: FT.AGGREGATE — https://redis.io/docs/latest/commands/ft.aggregate/
- Redis official docs: FT.CURSOR DEL — https://redis.io/docs/latest/commands/ft.cursor-del/
- Redis official docs: Aggregations / Cursor API — https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/aggregations/

## Issues Found
1. **Incorrect error message for expired/invalid cursor**: The blog stated the error was `(error) ERR Cursor not found` but the official Redis documentation shows the actual error text is `(error) Cursor does not exist`. Fixed the error message in the Error Handling section to match the documented behavior.

## Review Notes
- The command syntax, parameters, return format, and MAXIDLE default (300000ms / 5 minutes) are all accurate per official docs.
- The WITHCURSOR and COUNT usage with FT.AGGREGATE is correct.
- The sample data setup with FT.CREATE and HSET commands is syntactically correct.
- The example output format showing `[results, cursor_id]` with cursor_id=0 meaning exhausted is accurate.
- The recommendation table for when to use cursors vs LIMIT/OFFSET is sound. The official docs note that cursors are more efficient than LIMIT with offset for large result sets because the query executes only once with state stored server-side.
- The mention of FT.CURSOR DEL in the summary is good practice; the official docs confirm cursors should be explicitly deleted when no longer needed.
- The default COUNT read size per the docs is 1000; the blog doesn't mention this specific default but correctly states it is "the server-configured value," which is acceptable.
