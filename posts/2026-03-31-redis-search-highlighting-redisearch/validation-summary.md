# Validation Summary: How to Implement Search Highlighting with RediSearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (Redis Search module)
- redis-py (Python Redis client)
- RedisJSON (for JSON document storage)

## Sources Consulted
- redis-py source code: `Query.summarize()` and `Query.highlight()` method signatures verified via local inspection (`inspect.signature`)
- Redis official documentation for FT.SEARCH HIGHLIGHT and SUMMARIZE options (https://redis.io/docs/latest/commands/ft.search/)
- redis-py Query class API for `with_scores()`, `paging()`, `highlight()`, `summarize()`

## Issues Found

1. **Incorrect parameter name `frag_len` in `Query.summarize()`** (3 occurrences)
   - **What was wrong:** The blog used `frag_len=` as the parameter for fragment length in `.summarize()`. The actual redis-py parameter is `context_len=`.
   - **What was changed:** Replaced `frag_len` with `context_len` in `search_with_snippets()`, `search_highlight_html()`, and `search_highlight_markers()` functions.
   - **Why:** Using `frag_len` would cause a `TypeError` at runtime since it is not a recognized keyword argument.

2. **Incorrect parameter name `separator` in `Query.summarize()`** (1 occurrence)
   - **What was wrong:** The blog used `separator=" ... "` in `search_with_snippets()`. The actual redis-py parameter is `sep=`.
   - **What was changed:** Replaced `separator` with `sep`.
   - **Why:** Using `separator` would cause a `TypeError` at runtime since it is not a recognized keyword argument.

3. **Accessing `doc.score` without calling `.with_scores()`** (1 occurrence)
   - **What was wrong:** In `search_with_snippets()`, the return dict included `"score": doc.score`, but the Query did not chain `.with_scores()`. Without it, `doc.score` is `None`.
   - **What was changed:** Added `.with_scores()` to the query chain in `search_with_snippets()`.
   - **Why:** Without `.with_scores()`, the search results do not include meaningful relevance scores, making the score field misleading.

## Review Notes
- The Redis CLI command on line 153 is correct: `FT.SEARCH idx:highlight "search" HIGHLIGHT FIELDS 2 title body TAGS "<b>" "</b>" SUMMARIZE FIELDS 1 body FRAGS 2 LEN 80` uses proper syntax with field counts and argument names.
- The JSON index setup using `$.field` JSONPath notation with `as_name` aliases is correct for redis-py with RedisJSON.
- The `IndexDefinition` with `IndexType.JSON` and prefix-based indexing is correctly configured.
- Both HIGHLIGHT and SUMMARIZE can be used together in the same query; redis-py internally orders SUMMARIZE before HIGHLIGHT regardless of method call order.
- The post correctly notes that HIGHLIGHT/SUMMARIZE add CPU overhead, which is accurate.
