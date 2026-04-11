# How to Use FT.PROFILE in Redis to Analyze Query Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Full-Text Search, Performance, Query Optimization

Description: Learn how to use FT.PROFILE in Redis Stack to profile FT.SEARCH and FT.AGGREGATE queries, revealing execution steps and time breakdowns.

---

## What Is FT.PROFILE?

`FT.PROFILE` is a RediSearch command that executes a search or aggregate query while collecting detailed profiling information about each step of the query execution. It returns both the normal query results and a profiling report showing how much time was spent in each phase.

This command is analogous to `EXPLAIN ANALYZE` in SQL databases - it tells you not just what the query does but how long each part takes.

## Basic Syntax

```text
FT.PROFILE index SEARCH [LIMITED] QUERY query [query options]
FT.PROFILE index AGGREGATE [LIMITED] QUERY query [aggregate options]
```

Parameters:
- `index` - the RediSearch index name
- `SEARCH` or `AGGREGATE` - the query type to profile
- `LIMITED` - collect less detailed profiling data (faster)
- `QUERY query` - the query string and its options

## Setting Up a Sample Index

```bash
# Create a sample index
FT.CREATE products ON HASH PREFIX 1 product: SCHEMA name TEXT WEIGHT 5.0 category TAG price NUMERIC

# Add some documents
HSET product:1 name "Redis Cookbook" category "books" price 29.99
HSET product:2 name "Learning Redis" category "books" price 39.99
HSET product:3 name "Redis Developer" category "books,courses" price 49.99
HSET product:4 name "Redis Cache Guide" category "guides" price 0
```

## Profiling a SEARCH Query

```bash
FT.PROFILE products SEARCH QUERY "redis" LIMIT 0 10
```

The response has two parts:
1. Regular search results
2. Profile information array

```text
1) 1) (integer) 4           # Total results
   2) "product:1"           # Document key
   3) 1) "name"
      2) "Redis Cookbook"
      ...
2) 1) 1) "Total profile time"
      2) "0.127"
   2) 1) "Parsing time"
      2) "0.012"
   3) 1) "Pipeline creation time"
      2) "0.008"
   4) 1) "Warning"
      2) ""
   5) 1) "Iterators profile"
      2) ...
```

## Understanding Profile Output

### Key Timing Metrics

| Metric | Description |
|---|---|
| Total profile time | End-to-end query execution time (ms) |
| Parsing time | Time to parse the query string |
| Pipeline creation time | Time to build the execution plan |
| Iterators profile | Time in each index iterator |
| Result processors profile | Time in post-processing steps |

### Iterators Profile

```bash
FT.PROFILE products SEARCH QUERY "@category:{books} @price:[0 50]" LIMIT 0 100
```

The iterators profile shows:
- Which index terms were scanned
- How many documents each iterator produced
- Time spent in each iterator

## Profiling an AGGREGATE Query

```bash
FT.PROFILE products AGGREGATE QUERY "*" \
  GROUPBY 1 @category \
  REDUCE COUNT 0 AS total \
  SORTBY 2 @total DESC
```

This reveals the time taken for:
1. Full index scan
2. GROUPBY processing
3. REDUCE aggregation
4. SORT operation

## Using LIMITED Mode

```bash
# Less detailed but faster profiling
FT.PROFILE products SEARCH LIMITED QUERY "redis books"
```

`LIMITED` mode skips detailed iterator-level profiling and is useful when you only need top-level timing without the overhead of full profiling.

## Python Example

```python
import redis
from redis.commands.search.query import Query

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Profile a search query
result = r.ft('products').profile(
    Query('redis').paging(0, 10)
)

# result is a tuple: (search_results, profile_info)
search_results, profile_info = result
print(f"Total results: {search_results.total}")
print(f"Documents returned: {len(search_results.docs)}")
print(f"Profile data: {profile_info}")
```

## Identifying Slow Query Patterns

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

queries_to_test = [
    '@name:(redis)',
    '@category:{books}',
    '@price:[20 50]',
    '@name:(redis) @category:{books}',
]

for query in queries_to_test:
    raw = r.execute_command('FT.PROFILE', 'products', 'SEARCH', 'QUERY', query)
    # Extract total time from profile data
    print(f"Query: {query!r}")
    # Parse timing from raw response
```

## Optimization Tips Based on Profile Output

| Profile Finding | Optimization |
|---|---|
| High parsing time | Simplify complex query syntax |
| High iterator time on TEXT | Add more specific filters (TAG/NUMERIC) |
| Many docs scanned, few returned | Add filters before text search |
| High result processor time | Reduce SORTBY on large result sets |
| Full index scan | Add filter predicates |

## Summary

`FT.PROFILE` is the primary tool for understanding and optimizing RediSearch query performance. It reveals how much time is spent in each phase of query execution - from parsing to index scanning to result processing. Use it to identify whether slow queries are caused by inefficient index scans, missing filters, or expensive aggregation steps. Combine `FT.PROFILE` with `FT.EXPLAIN` (which shows the execution plan without running the query) for a complete picture of query behavior.
