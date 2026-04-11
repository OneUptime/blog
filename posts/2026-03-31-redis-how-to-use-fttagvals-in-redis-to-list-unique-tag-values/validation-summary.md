# Validation Summary: How to Use FT.TAGVALS in Redis to List Unique Tag Values

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Redis Stack / RediSearch module)
- RediSearch FT.TAGVALS command
- RediSearch FT.CREATE, FT.SEARCH, FT.AGGREGATE commands
- Python redis-py client library

## Sources Consulted
- [FT.TAGVALS | Redis Docs](https://redis.io/docs/latest/commands/FT.TAGVALS/) — official command reference, confirms syntax, return type, and deprecation status
- [FT.CREATE | Redis Docs](https://redis.io/docs/latest/commands/ft.create/) — verified index creation syntax with ON HASH, PREFIX, and SCHEMA clauses
- [Tag Fields | Redis Docs](https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/tags/) — verified multi-value tag splitting behavior with comma separator

## Issues Found
- **Missing deprecation notice**: FT.TAGVALS is marked as deprecated in the official Redis documentation. The post did not mention this. Added a note in the Limitations section advising readers to consider `FT.AGGREGATE` with `GROUPBY` and `REDUCE COUNT` as a more flexible alternative.

## Review Notes
- The FT.TAGVALS command is categorized under ACL categories `@dangerous` and `@slow` (O(N) complexity), reinforcing the recommendation to use FT.AGGREGATE for production workloads with high tag cardinality.
- All code examples (FT.CREATE syntax, HSET commands, Python redis-py usage with `execute_command`) are correct.
- Multi-value tag behavior (comma-separated values split into individual tokens) is correctly explained and demonstrated.
- The expected outputs for FT.TAGVALS match the sample data provided.
- The Python f-string TAG filter syntax `f'@{field}:{{{value}}}'` correctly produces RediSearch query syntax like `@category:{books}`.
- The `FT.SEARCH` with `LIMIT 0 0` to get only the document count is a correct technique.
