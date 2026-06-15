# Validation Summary: How to Build Full-Text Search with RediSearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Redis Stack
- RediSearch / Redis Query Engine
- Redis hashes
- Python
- redis-py
- Docker

## Sources Consulted
- Redis FT.CREATE command documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis FT.SEARCH command documentation: https://redis.io/docs/latest/commands/ft.search/
- Redis query syntax documentation: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/query_syntax/
- Redis TAG fields documentation: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/tags/
- Redis FT.AGGREGATE command documentation: https://redis.io/docs/latest/commands/ft.aggregate/
- Redis FT.SUGADD command documentation: https://redis.io/docs/latest/commands/ft.sugadd/
- Redis FT.SUGGET command documentation: https://redis.io/docs/latest/commands/ft.sugget/
- Redis Stack Docker documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-stack/docker/

## Issues Found
- The setup section used the deprecated `redislabs/redisearch:latest` Docker image. Changed it to the current official `redis/redis-stack-server:latest` image.
- The persistence Docker command manually invoked `redis-server --loadmodule ...`. Redis Stack images already include the search module, and the official configuration path uses environment variables for Redis arguments. Changed the command to use `-e REDIS_ARGS="--appendonly yes"`.
- The product index used `category` and `brand` TAG fields in aggregation examples without making them sortable. Marked those fields as `SORTABLE` so the aggregation examples can access them efficiently.
- The filtered wildcard example produced a query like `(*) @price:[-inf 100]`, but Redis documents `*` as a standalone all-documents query that cannot be combined inside the query string. Changed the query builder to use only the filter clauses when the base query is `*`.
- The `FT.SEARCH` example placed `LIMIT` before `SORTBY`. Moved `SORTBY` before `LIMIT` to match the documented command syntax.
- The fuzzy-search comment said `%%` means one-character distance. Redis documents `%term%` as Levenshtein distance 1 and `%%term%%` as distance 2. Corrected the comment and example.
- The highlighting example reused `parse_search_results`, which expects `WITHSCORES`, but the command did not request scores. Added `WITHSCORES` to keep the result shape compatible with the parser.

## Review Notes
- The Python snippets were syntax-checked with `python3` and compile successfully.
- The post uses low-level `execute_command` calls rather than redis-py RediSearch helper classes. This is technically valid and keeps the examples close to Redis command syntax.
