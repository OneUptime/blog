# Validation Summary: How to Implement Faceted Search with RediSearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RediSearch module)
- Python (redis-py client library)
- RediSearch aggregation (FT.AGGREGATE)
- RediSearch query syntax (tag filters, numeric filters)
- JSON indexing with RediSearch

## Sources Consulted
- redis-py source code (v7.0.1) at `/Users/nawazdhandala/Library/Python/3.9/lib/python/site-packages/redis/commands/search/aggregation.py` — verified `AggregateRequest.sort_by()` signature and `AggregateResult.rows` return format
- redis-py source code at `redis/commands/search/commands.py` — verified `_get_aggregate_result()` and aggregate result parsing for RESP2
- redis-py test suite — confirmed `AggregateResult.rows` returns flat lists of alternating key-value pairs, not dictionaries
- RediSearch documentation for FT.AGGREGATE command syntax and GROUPBY/REDUCE/SORTBY arguments

## Issues Found

1. **Incorrect `sort_by` API usage**: Both `get_category_facets` and `get_brand_facets` used `.sort_by("@count", asc=False)`. The `asc` keyword argument does not exist on `AggregateRequest.sort_by()` — it is silently absorbed by `**kwargs` and ignored. A plain string field name produces no sort direction, defaulting to ascending (the opposite of what was intended). Fixed by importing `Desc` from `redis.commands.search.aggregation` and using `.sort_by(Desc("@count"))`.

2. **Incorrect aggregate result row access**: Code used `row["category"]` and `row["count"]` to access aggregate result fields. Under the default RESP2 protocol, `AggregateResult.rows` contains flat lists of alternating key-value pairs (e.g., `["category", "Electronics", "count", "5"]`), not dictionaries. Accessing by string key raises `TypeError`. Fixed by using positional index access (`row[1]`, `row[3]`).

3. **`__import__` hack in price range facets**: The `get_price_range_facets` function used `__import__("redis.commands.search.query", fromlist=["Query"]).Query(q)` instead of a proper import. While technically functional, this is confusing and non-idiomatic, especially in a tutorial. Fixed by adding `from redis.commands.search.query import Query` at the top of the code block.

4. **Unused imports removed**: `GroupBy` and `Reducer` were imported from `redis.commands.search.aggregation` but never used. Replaced with the actually needed `Desc` import.

## Review Notes
- The faceted search function computes facet counts using only the text query (not the full filtered query including active filters). This is a valid design choice for some UIs but differs from the common pattern where facet counts reflect currently active filters. This is a design decision, not a technical error.
- The `TagField` separator parameter defaults to `,` in redis-py, so explicitly passing `separator=","` is redundant but not incorrect.
- The CLI command in the Monitoring section is correct RediSearch FT.AGGREGATE syntax.
