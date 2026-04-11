# Validation Summary: How to Use FT.CURSOR DEL in Redis to Free Cursors

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- RediSearch (Redis Search module)
- FT.CURSOR DEL command
- FT.CURSOR READ command
- FT.AGGREGATE command with WITHCURSOR

## Sources Consulted
- Official Redis FT.CURSOR DEL documentation: https://redis.io/docs/latest/commands/ft.cursor-del/
- Official Redis FT.CURSOR READ documentation: https://redis.io/docs/latest/commands/ft.cursor-read/
- Official Redis FT.AGGREGATE documentation: https://redis.io/docs/latest/commands/FT.AGGREGATE/
- Redis Cursor API / Aggregations concepts: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/aggregations/

## Issues Found
1. **Incorrect error message for non-existent cursor**: The post showed `(error) ERR Cursor not found` but the official Redis documentation specifies the error message is `Cursor does not exist` (without the `ERR` prefix). Fixed to `(error) Cursor does not exist`.

## Review Notes
- The syntax `FT.CURSOR DEL index cursor_id` is correct per official docs.
- The return value of `OK` on success is correct.
- The WITHCURSOR syntax with COUNT and MAXIDLE parameters is accurate.
- MAXIDLE is correctly described as being in milliseconds with a default of 300000 (5 minutes).
- The behavior of cursor_id returning 0 on exhaustion is correct.
- The FT.CURSOR READ COUNT parameter usage is accurate.
- The mermaid diagrams correctly illustrate the cursor lifecycle.
- Best practices around cursor cleanup are sound and well-presented.
