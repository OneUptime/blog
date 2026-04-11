# How to Implement Faceted Search with RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Faceted Search, Filter, E-Commerce

Description: Implement faceted search with RediSearch to build Amazon-style filter panels that show category counts alongside search results.

---

Faceted search lets users progressively narrow results by selecting filters - category, price range, brand, rating. RediSearch aggregation queries compute facet counts in the same request as the main search, keeping the UI fast.

## Index Setup for Faceted Search

```python
import redis
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_facet_index():
    schema = (
        TextField("$.name", as_name="name", weight=3.0),
        NumericField("$.price", as_name="price"),
        NumericField("$.rating", as_name="rating"),
        TagField("$.category", as_name="category", separator=","),
        TagField("$.brand", as_name="brand", separator=","),
        TagField("$.color", as_name="color", separator=","),
    )
    r.ft("idx:facets").create_index(
        schema,
        definition=IndexDefinition(prefix=["product:"], index_type=IndexType.JSON),
    )
```

## Computing Facet Counts with Aggregation

```python
from redis.commands.search.aggregation import AggregateRequest, Desc
import redis.commands.search.reducers as reducers

def get_category_facets(base_query: str = "*") -> list:
    req = (
        AggregateRequest(base_query)
        .group_by("@category", reducers.count().alias("count"))
        .sort_by(Desc("@count"))
    )
    result = r.ft("idx:facets").aggregate(req)
    return [{"category": row[1], "count": int(row[3])}
            for row in result.rows]

def get_brand_facets(base_query: str = "*") -> list:
    req = (
        AggregateRequest(base_query)
        .group_by("@brand", reducers.count().alias("count"))
        .sort_by(Desc("@count"))
        .limit(0, 20)
    )
    result = r.ft("idx:facets").aggregate(req)
    return [{"brand": row[1], "count": int(row[3])}
            for row in result.rows]
```

## Price Range Facets

```python
from redis.commands.search.query import Query

def get_price_range_facets(base_query: str = "*") -> dict:
    buckets = [
        ("under_25", "[0 25]"),
        ("25_to_50", "[25 50]"),
        ("50_to_100", "[50 100]"),
        ("over_100", "[100 +inf]"),
    ]
    result = {}
    for name, price_range in buckets:
        q = f"({base_query}) @price:{price_range}"
        count = r.ft("idx:facets").search(
            Query(q).paging(0, 0)
        ).total
        result[name] = count
    return result
```

## Combined Search with Active Filters

```python
from redis.commands.search.query import Query

def faceted_search(text: str = "", category: str = None,
                   brand: str = None, min_price: float = 0,
                   max_price: float = 9999, page: int = 0,
                   page_size: int = 20) -> dict:
    filters = [f"@price:[{min_price} {max_price}]"]
    if category:
        filters.append(f"@category:{{{category}}}")
    if brand:
        filters.append(f"@brand:{{{brand}}}")

    query_str = text or "*"
    if filters:
        query_str += " " + " ".join(filters)

    query = Query(query_str).paging(page * page_size, page_size)
    results = r.ft("idx:facets").search(query)

    return {
        "total": results.total,
        "page": page,
        "results": [doc.__dict__ for doc in results.docs],
        "facets": {
            "categories": get_category_facets(text or "*"),
            "brands": get_brand_facets(text or "*"),
        },
    }
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to track your search API latency - faceted aggregation queries are more expensive than simple text searches and may need caching.

```bash
redis-cli FT.AGGREGATE idx:facets "*" GROUPBY 1 @category REDUCE COUNT 0 AS count SORTBY 2 @count DESC
```

## Summary

RediSearch aggregation groups results by Tag field values to compute facet counts in a single round-trip. Combining base query text with category, brand, and price filters using query string syntax applies all active facets simultaneously. Cache facet count results for a few seconds to reduce load on heavy traffic search pages.
