# How to Build an E-Commerce Search with Filters Using RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, E-Commerce, Search, Filter

Description: Build a complete e-commerce search experience with RediSearch supporting keyword search, price filters, sort options, and autocomplete.

---

E-commerce search must handle keyword matching, numeric range filtering, tag-based category filters, multiple sort orders, and autocomplete - all in under 20ms. RediSearch delivers all of these from a single Redis instance.

## Complete E-Commerce Index

```python
import redis
from redis.commands.search.field import (
    TextField, NumericField, TagField
)
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_ecommerce_index():
    schema = (
        TextField("$.name", as_name="name", weight=10.0),
        TextField("$.description", as_name="description", weight=2.0),
        TextField("$.brand", as_name="brand", weight=5.0),
        NumericField("$.price", as_name="price"),
        NumericField("$.rating", as_name="rating"),
        NumericField("$.review_count", as_name="review_count"),
        NumericField("$.stock", as_name="stock"),
        TagField("$.category", as_name="category", separator=","),
        TagField("$.subcategory", as_name="subcategory"),
        TagField("$.color", as_name="color", separator=","),
        TagField("$.size", as_name="size", separator=","),
        TagField("$.on_sale", as_name="on_sale"),
    )
    r.ft("idx:ecommerce").create_index(
        schema,
        definition=IndexDefinition(prefix=["product:"], index_type=IndexType.JSON),
    )
```

## Search with All Filters

```python
from redis.commands.search.query import Query
import json

def ecommerce_search(
    text: str = "",
    category: str = None,
    min_price: float = 0,
    max_price: float = 99999,
    min_rating: float = 0,
    colors: list = None,
    sizes: list = None,
    on_sale_only: bool = False,
    sort_by: str = "relevance",
    page: int = 0,
    page_size: int = 24,
) -> dict:
    filters = [
        f"@price:[{min_price} {max_price}]",
        f"@rating:[{min_rating} +inf]",
        "@stock:[1 +inf]",
    ]

    if category:
        filters.append(f"@category:{{{category}}}")
    if colors:
        color_filter = "|".join(colors)
        filters.append(f"@color:{{{color_filter}}}")
    if sizes:
        size_filter = "|".join(sizes)
        filters.append(f"@size:{{{size_filter}}}")
    if on_sale_only:
        filters.append("@on_sale:{true}")

    base_query = text if text else "*"
    query_str = f"({base_query}) " + " ".join(filters)

    query = Query(query_str).paging(page * page_size, page_size)

    if sort_by == "price_asc":
        query = query.sort_by("price", asc=True)
    elif sort_by == "price_desc":
        query = query.sort_by("price", asc=False)
    elif sort_by == "rating":
        query = query.sort_by("rating", asc=False)
    elif sort_by == "reviews":
        query = query.sort_by("review_count", asc=False)

    results = r.ft("idx:ecommerce").search(query)

    return {
        "total": results.total,
        "page": page,
        "page_size": page_size,
        "products": [json.loads(doc.json) for doc in results.docs],
    }
```

## Autocomplete with Suggestion Index

```python
from redis.commands.search.suggestion import Suggestion

def add_autocomplete_suggestion(term: str, score: float = 1.0):
    r.ft("idx:ecommerce").sugadd("ac:products", Suggestion(term, score))

def autocomplete(prefix: str, limit: int = 5) -> list:
    return r.ft("idx:ecommerce").sugget(
        "ac:products", prefix,
        num=limit, fuzzy=True, with_scores=True
    )
```

## Similar Products

```python
def get_similar_products(product_id: str, n: int = 6) -> list:
    product = r.json().get(f"product:{product_id}")
    if not product:
        return []

    category = product.get("category", "")
    price = float(product.get("price", 0))
    min_p = price * 0.7
    max_p = price * 1.3

    query_str = (
        f"@category:{{{category}}} "
        f"@price:[{min_p} {max_p}] "
        f"@stock:[1 +inf]"
    )
    results = r.ft("idx:ecommerce").search(
        Query(query_str).paging(0, n + 1).sort_by("rating", asc=False)
    )
    return [
        json.loads(doc.json)
        for doc in results.docs
        if doc.id != f"product:{product_id}"
    ][:n]
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your search API - e-commerce searches are user-facing and latency directly impacts conversion rates.

```bash
redis-cli FT.INFO idx:ecommerce
redis-cli FT.SEARCH idx:ecommerce "(@category:{electronics}) (@price:[0 200])" LIMIT 0 5 SORTBY price ASC
```

## Summary

RediSearch supports the full e-commerce search stack - keyword search, multi-field filtering, numeric ranges, tag-based category and attribute filters, and custom sort orders - all from a single FT.SEARCH command. The suggestion index provides autocomplete separate from the main search index. Similar products use price-range and category filters to return contextually relevant upsells without machine learning.
