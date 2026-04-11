# Validation Summary: How to Build an E-Commerce Search with Filters Using RediSearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (Redis Search and Query)
- redis-py (Python Redis client)
- RedisJSON

## Sources Consulted
- redis-py SearchCommands source code (https://redis.readthedocs.io/en/stable/_modules/redis/commands/search/commands.html)
- FT.SUGADD command documentation (https://redis.io/docs/latest/commands/FT.SUGADD/)
- FT.SUGGET command documentation (https://redis.io/docs/latest/commands/ft.sugget/)
- FT.SEARCH command documentation (https://redis.io/docs/latest/commands/ft.search/)
- Redis Search and Query tag fields documentation (https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/tags/)
- Redis autocomplete documentation (https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/autocomplete/)
- redis-py index and query JSON documents guide (https://redis.io/docs/latest/develop/clients/redis-py/queryjson/)

## Issues Found
1. **`sugadd` called with raw arguments instead of a `Suggestion` object**: The original code called `r.ft("idx:ecommerce").sugadd("ac:products", term, score)` passing the term string and score as separate arguments. The redis-py `sugadd` method expects `Suggestion` objects from `redis.commands.search.suggestion`. Fixed by importing `Suggestion` and wrapping the arguments: `Suggestion(term, score)`.

2. **Incorrect parameter name `withscores` in `sugget`**: The original code used `withscores=True`. The redis-py `sugget` method uses an underscore-separated parameter name: `with_scores=True`. Fixed the parameter name.

## Review Notes
- The `TagField` separator for `category`, `color`, and `size` is explicitly set to `","` which is already the default. This is harmless and arguably clearer for readers.
- The index creation, JSON path field mappings, Query API usage (paging, sort_by), numeric range filters, tag filters, and CLI commands are all correct.
- The `doc.json` attribute access for JSON index results is correct — redis-py stores the full JSON document string in this attribute.
- The FT.SEARCH CLI syntax including LIMIT and SORTBY clauses is valid.
