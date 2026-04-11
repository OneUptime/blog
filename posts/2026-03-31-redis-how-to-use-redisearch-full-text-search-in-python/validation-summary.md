# Validation Summary: How to Use RediSearch Full-Text Search in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RediSearch module / Redis Stack)
- Python
- redis-py (4.0+)
- RediSearch full-text search
- Docker (for Redis Stack)

## Sources Consulted
- redis-py GitHub repository source code: https://github.com/redis/redis-py
- redis-py `redis/commands/search/field.py` — field class definitions
- redis-py `redis/commands/search/index_definition.py` — IndexDefinition and IndexType
- redis-py `redis/commands/search/query.py` — Query and NumericFilter classes
- redis-py `redis/commands/search/aggregation.py` — AggregateRequest, Asc, Desc classes
- redis-py `redis/commands/search/reducers.py` — reducer functions (count, avg, etc.)
- redis-py `doctests/search_quickstart.py` — official usage examples
- redis-py `doctests/query_agg.py` — aggregation usage examples
- redis-py `tests/test_search.py` — test suite confirming API usage patterns

## Issues Found

1. **Wrong import path for IndexDefinition** (line 39): The post used `from redis.commands.search.indexDefinition import IndexDefinition, IndexType` (camelCase). The actual module file in redis-py is `index_definition.py` (snake_case). Fixed to `from redis.commands.search.index_definition import IndexDefinition, IndexType`.

2. **`Query.NumericFilter` does not exist as a class attribute** (line 138): The post used `Query.NumericFilter('price', 0, 100)`. `NumericFilter` is a standalone class in `redis.commands.search.query`, not an attribute of `Query`. Fixed to import `NumericFilter` directly (`from redis.commands.search.query import Query, NumericFilter`) and use `NumericFilter('price', 0, 100)`.

3. **Wrong import: `Reducer` from aggregation module** (line 210): The post imported `Reducer` from `redis.commands.search.aggregation`, but `Reducer` is defined in `redis.commands.search.reducers`. The import was unused in the code. Replaced with `Desc` which is actually needed for the sort_by fix.

4. **`AggregateRequest.sort_by` uses wrong syntax** (line 219): The post used `.sort_by('@count', asc=False)`. The `AggregateRequest.sort_by` method does not accept an `asc` keyword argument — it requires `Asc` or `Desc` wrapper objects from `redis.commands.search.aggregation`. Fixed to `.sort_by(Desc('@count'))`.

## Review Notes
- The `Query.sort_by('field', asc=True/False)` syntax used in the Sorting Results section is correct — `Query.sort_by` and `AggregateRequest.sort_by` have different APIs, which is a common source of confusion.
- The aggregation result row access pattern (`row[1]`, `row[3]`, `row[5]`) is correct but fragile — rows are flat lists with alternating key-value pairs. This is the documented behavior but could break if redis-py changes the result format in future versions.
- All other code examples (creating indexes, indexing documents, basic search, tag filters, sorting, pagination, dropping indexes) are correct and follow current redis-py conventions.
