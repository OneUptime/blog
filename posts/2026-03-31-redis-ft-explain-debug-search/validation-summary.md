# Validation Summary: How to Use FT.EXPLAIN in Redis to Debug Search Queries

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- RediSearch (Redis Stack Search and Query)
- FT.EXPLAIN command
- FT.EXPLAINCLI command
- FT.CREATE command

## Sources Consulted
- Official Redis FT.EXPLAIN documentation: https://redis.io/docs/latest/commands/ft.explain/
- Official Redis FT.EXPLAINCLI documentation: https://redis.io/docs/latest/commands/ft.explaincli/
- Redis Search query dialects documentation: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/dialects/
- Redis full-text search (fuzzy matching) documentation: https://redis.io/docs/latest/develop/ai/search-and-query/query/full-text/

## Issues Found

1. **Incomplete dialect versions**: The post listed supported DIALECT versions as "1, 2, or 3" but dialect 4 (introduced in RediSearch v2.8) also exists. Fixed to "1, 2, 3, or 4".

2. **Incorrect claim about fuzzy matching and DIALECT 2**: The post stated "Dialect 2 enables fuzzy matching with `%term%` syntax." Fuzzy matching with `%term%` syntax works in all dialects and is not a DIALECT 2 feature. Fixed the explanation to clarify that fuzzy matching is available across all dialects, and the DIALECT parameter controls how certain operators are parsed in compound expressions.

3. **Inaccurate FT.EXPLAINCLI description**: The post described FT.EXPLAINCLI as formatting "output with indentation" and FT.EXPLAIN as returning "a flat string." The actual difference is in the response type: FT.EXPLAIN returns a single bulk string (requiring `redis-cli --raw` for proper line break display), while FT.EXPLAINCLI returns an array of strings (one per line) for easier reading in `redis-cli`. Fixed to accurately describe this distinction.

## Review Notes
- The execution plan output examples are representative/illustrative. Actual output formatting may vary slightly across Redis Stack versions.
- Dialects 1, 3, and 4 are deprecated in Redis 8, though dialect 1 remains the default. The post does not mention deprecation status, which is acceptable for a general tutorial but could be noted in a future update.
- The FT.CREATE syntax and all query examples are correct and follow current conventions.
