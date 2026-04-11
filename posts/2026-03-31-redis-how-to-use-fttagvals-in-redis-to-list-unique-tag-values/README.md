# How to Use FT.TAGVALS in Redis to List Unique Tag Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Tag, Full-Text Search, Faceted Search

Description: Learn how to use FT.TAGVALS in Redis to retrieve all unique values indexed for a TAG field, enabling faceted navigation and filter dropdowns.

---

## What Is FT.TAGVALS?

`FT.TAGVALS` returns all unique values stored in a TAG field of a RediSearch index. TAG fields in RediSearch are designed for exact-match filtering and faceted search - think categories, statuses, labels, or enum values. `FT.TAGVALS` lets you enumerate all possible filter values without scanning the entire keyspace.

## Basic Syntax

```text
FT.TAGVALS index field_name
```

Parameters:
- `index` - the name of the RediSearch index
- `field_name` - the name of the TAG field

Returns an array of unique tag values.

## Setting Up a Sample Index

```bash
# Create an index with TAG fields
FT.CREATE products ON HASH PREFIX 1 prod: \
  SCHEMA \
    name TEXT \
    category TAG \
    brand TAG \
    status TAG \
    price NUMERIC

# Add documents
HSET prod:1 name "Redis Book" category "books" brand "oreilly" status "available"
HSET prod:2 name "Node.js Guide" category "books" brand "oreilly" status "available"
HSET prod:3 name "Redis Course" category "courses,online" brand "udemy" status "available"
HSET prod:4 name "Old Product" category "books" brand "pearson" status "discontinued"
HSET prod:5 name "Redis Workshop" category "courses,in-person" brand "redis-labs" status "upcoming"
```

## Listing All Unique Tag Values

```bash
# Get all unique values for the 'category' TAG field
FT.TAGVALS products category
# Returns:
# 1) "books"
# 2) "courses"
# 3) "online"
# 4) "in-person"

# Get all unique brands
FT.TAGVALS products brand
# Returns:
# 1) "oreilly"
# 2) "udemy"
# 3) "pearson"
# 4) "redis-labs"

# Get all unique statuses
FT.TAGVALS products status
# Returns:
# 1) "available"
# 2) "discontinued"
# 3) "upcoming"
```

Note that multi-value tags (like `"courses,online"`) are indexed as separate tokens.

## Building a Faceted Search UI

`FT.TAGVALS` is ideal for populating filter dropdowns or facets in search UIs:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_filter_options(r, index_name):
    """Get all available filter options for a search UI."""
    tag_fields = ['category', 'brand', 'status']
    filters = {}

    for field in tag_fields:
        values = r.execute_command('FT.TAGVALS', index_name, field)
        filters[field] = sorted(values) if values else []

    return filters

options = get_filter_options(r, 'products')
for field, values in options.items():
    print(f"{field}: {values}")
```

## Using Tag Values to Validate Filters

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def search_with_validation(r, index, query, filters):
    """Search with pre-validated tag filters."""
    # Validate filters against known tag values
    for field, value in filters.items():
        valid_values = set(r.execute_command('FT.TAGVALS', index, field) or [])
        if value not in valid_values:
            raise ValueError(f"Invalid filter value '{value}' for field '{field}'. "
                           f"Valid values: {sorted(valid_values)}")

    # Build RediSearch query
    filter_parts = [query]
    for field, value in filters.items():
        filter_parts.append(f'@{field}:{{{value}}}')

    full_query = ' '.join(filter_parts)
    return r.execute_command('FT.SEARCH', index, full_query)

try:
    results = search_with_validation(
        r, 'products', 'redis',
        {'category': 'books', 'status': 'available'}
    )
    print(f"Found {results[0]} results")
except ValueError as e:
    print(f"Validation error: {e}")
```

## Monitoring Tag Distribution

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_tag_distribution(r, index, field):
    """Count documents for each unique tag value."""
    values = r.execute_command('FT.TAGVALS', index, field) or []
    distribution = {}

    for value in values:
        result = r.execute_command('FT.SEARCH', index, f'@{field}:{{{value}}}', 'LIMIT', '0', '0')
        distribution[value] = result[0]

    return distribution

dist = get_tag_distribution(r, 'products', 'status')
for status, count in sorted(dist.items()):
    print(f"  {status}: {count} products")
```

## Limitations

- `FT.TAGVALS` is **deprecated** in recent versions of Redis Stack. Consider using `FT.AGGREGATE` with `GROUPBY` and `REDUCE COUNT` as a more flexible alternative
- `FT.TAGVALS` only works on fields indexed as `TAG`, not `TEXT`, `NUMERIC`, or `GEO`
- For very large indices with thousands of unique tag values, the response can be large
- There is no filtering or pagination - all values are returned at once

## Summary

`FT.TAGVALS` is the simplest way to enumerate all unique values for a TAG field in a RediSearch index, making it perfect for building faceted search interfaces, filter dropdowns, and tag-based navigation. It returns a complete list of all indexed tag values, which you can use to populate UI components, validate user-provided filters, or analyze the distribution of categorical data across your indexed documents.
