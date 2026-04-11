# Validation Summary: How to Use FT.AGGREGATE in Redis for Search Aggregations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RediSearch module)
- FT.AGGREGATE command
- FT.CREATE command
- HSET command
- redis-py (Python Redis client)

## Sources Consulted
- Redis FT.AGGREGATE official documentation: https://redis.io/docs/latest/commands/ft.aggregate/
- Redis FT.CREATE official documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis Search aggregations guide: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/aggregations/
- redis-py GitHub repository and AggregateRequest API: https://github.com/redis/redis-py
- redisearch-py aggregation module documentation

## Issues Found
1. **Python `sort_by` API incorrect**: The Python example used `.sort_by("@revenue", asc=False)`, which is not a valid API call. The `AggregateRequest.sort_by()` method does not accept an `asc` keyword parameter. It requires `Asc` or `Desc` wrapper objects from `redis.commands.search.aggregation`. Fixed by importing `Desc` and changing to `.sort_by(Desc("@revenue"))`.

## Review Notes
- All Redis CLI examples (FT.CREATE, HSET, FT.AGGREGATE with GROUPBY/REDUCE/SORTBY/APPLY/FILTER/LIMIT) are syntactically correct with proper nargs counts.
- The sample output for "Count Orders by Status" correctly matches the prerequisite data (shipped=3, pending=1, canceled=1).
- The SORTBY nargs values are correct throughout (e.g., `SORTBY 2 @field DESC` where 2 = field + direction).
- The LOAD, REDUCE, and QUANTILE nargs are all correct.
- The available reducers table is accurate and complete for RediSearch.
- The TAG query syntax `@status:{shipped}` is correct.
- The mermaid pipeline diagram accurately represents the FT.AGGREGATE execution order.
