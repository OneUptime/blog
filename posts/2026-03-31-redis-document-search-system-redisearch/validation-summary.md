# Validation Summary: How to Build a Document Search System with RediSearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with Redis Stack / RediSearch module)
- redis-py (Python Redis client, >= 4.x with search commands)
- RediSearch full-text search engine
- RedisJSON (JSON document storage)

## Sources Consulted
- redis-py source code for `Query.summarize()` signature: https://github.com/redis/redis-py/blob/master/redis/commands/search/query.py
- RediSearch query syntax documentation: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/query_syntax/
- RediSearch scoring documentation: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/scoring/
- redis-py JSON document indexing guide: https://redis.io/docs/latest/develop/clients/redis-py/queryjson/

## Issues Found

### 1. Incorrect parameter name in `Query.summarize()` (line 69)
- **What was wrong:** `frag_len=50` is not a valid parameter for `Query.summarize()` in redis-py. This would raise a `TypeError` at runtime.
- **What was changed:** Replaced `frag_len=50` with `context_len=50`, which is the correct parameter name in the redis-py `Query.summarize()` method.
- **Why:** The redis-py `Query.summarize()` method accepts `context_len` to control the size of each summary fragment, not `frag_len`.

### 2. Missing `.with_scores()` on search query (line 65-70)
- **What was wrong:** The `search_documents` function accesses `doc.score` on each result document, but the Query was not configured to return scores. Without `.with_scores()`, the Document objects do not have a `score` attribute, causing an `AttributeError`.
- **What was changed:** Added `.with_scores()` to the Query chain before `.paging()`.
- **Why:** RediSearch does not return relevance scores by default. The `.with_scores()` method must be called on the Query to include scores in the response.

### 3. Incorrect AND operator syntax in query examples (line 120)
- **What was wrong:** The example used `"redis AND search"` with a comment suggesting `AND` is a query operator. In RediSearch, `AND` is not an explicit operator — it is either treated as a literal search term or filtered out as a stopword. The implicit AND behavior comes from space-separating terms.
- **What was changed:** Changed to `"redis search"` with an updated comment: "AND: both terms required (implicit with space-separated terms)".
- **Why:** RediSearch uses implicit AND for space-separated terms. The pipe `|` is OR, and `-` is NOT. There is no explicit `AND` keyword operator.

## Review Notes
- The `search_by_author` function uses `@author:{author_name}` which works for single-word author names but would not correctly match multi-word names like "John Smith". For multi-word names, the query should use `@author:(John Smith)` or `@author:"John Smith"`. This is not necessarily a bug but a limitation worth noting.
- The `import json` in the "Indexing Documents" section is used only in later functions (`search_by_author`, `search_by_tag`, `search_in_date_range`) via `json.loads(doc.json)`. The code assumes all functions share the same script context, which is reasonable for a tutorial.
- The index creation does not include error handling for the case where the index already exists (`ResponseError: Index already exists`). This is standard for tutorial code but worth noting for production use.
