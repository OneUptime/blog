# Validation Summary: How to Build a Real-Time Search Index with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (FT.CREATE, FT.SEARCH, FT.INFO)
- Python redis-py client (redis.commands.search module)

## Sources Consulted
- Redis FT.CREATE documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis FT.SEARCH documentation: https://redis.io/docs/latest/commands/ft.search/
- Redis FT.INFO documentation: https://redis.io/docs/latest/commands/ft.info/
- RediSearch query syntax: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/query_syntax/
- Redis indexing documentation: https://redis.io/docs/latest/develop/ai/search-and-query/indexing/
- redis-py search quickstart example: https://github.com/redis/redis-py/blob/master/doctests/search_quickstart.py
- redis-py index_definition.py source: https://github.com/redis/redis-py/blob/master/redis/commands/search/index_definition.py
- Redis KB - Is indexing performed synchronously?: https://redis.io/kb/doc/2cxjc2a8ux/

## Issues Found
1. **Incorrect import path for IndexDefinition**: The post used `from redis.commands.search.indexDefinition import IndexDefinition, IndexType` (camelCase). The correct module name in redis-py is snake_case: `from redis.commands.search.index_definition import IndexDefinition, IndexType`. Fixed by changing `indexDefinition` to `index_definition`.

2. **Missing parentheses in multi-field query syntax**: The search query used `@title|description:{query_str}` which, after f-string interpolation, produces `@title|description:term`. Per RediSearch query syntax documentation, multi-field modifiers with `|` require the search expression to be wrapped in parentheses: `@title|description:(term)`. Fixed by changing the f-string to `@title|description:({query_str})`.

## Review Notes
- The claim that RediSearch indexes synchronously on write is accurate for new documents written after index creation. Initial index creation on existing data uses background indexing, which the post correctly alludes to in the monitoring section (`indexing` and `percent_indexed` fields).
- The search function works correctly for single-word queries as demonstrated, but multi-word queries passed as `query_str` would need additional escaping or quoting for robust production use. This is a limitation of the example rather than an error.
- All other code examples (HSET with mapping, partial updates, hash deletion for index removal, FT.INFO field names) are accurate and use current redis-py APIs.
