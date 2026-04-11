# Validation Summary: How to Use FT.SEARCH in Redis for Full-Text Search

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- RediSearch (FT.SEARCH command)
- redis-py (Python Redis client)

## Sources Consulted
- Redis FT.SEARCH official documentation: https://redis.io/docs/latest/commands/ft.search/
- Redis FT.CREATE official documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis query syntax documentation: https://redis.io/docs/latest/develop/interact/search-and-query/query/
- redis-py SearchCommands source: https://github.com/redis/redis-py/blob/master/redis/commands/search/commands.py
- redis-py Query class documentation: https://redis.readthedocs.io/en/stable/

## Issues Found
1. **Python example used incorrect API** (lines 180-196): The `search()` method in redis-py does not accept `sort_by`, `ascending`, `offset`, or `num` as keyword arguments. The method signature is `search(query, query_params=None)` where `query` is a string or `Query` object. Fixed by using the `Query` class builder pattern: `Query("redis").sort_by("age", asc=True).paging(0, 10)` and adding the required import `from redis.commands.search.query import Query`.

## Review Notes
- The `WITHPAYLOADS` option listed in the Basic Syntax section was deprecated in Redis 7.2+ (payloads feature removed). It is still technically valid syntax but readers on newer Redis versions should be aware it is deprecated. Not changed since the post does not use it in any examples.
- The Mermaid diagram references "TF-IDF + WEIGHT" as the scoring model. RediSearch 2.6+ defaults to BM25 scoring, though TF-IDF remains available as an alternative scorer. This is acceptable in a high-level diagram but worth noting for precision.
- All Redis CLI command examples (FT.CREATE, FT.SEARCH, HSET) use correct syntax and would work as shown.
- Query syntax reference table is accurate and complete for the most common operations.
- Tag filter, numeric range, phrase search, field-specific search, and combined query examples are all syntactically correct.
