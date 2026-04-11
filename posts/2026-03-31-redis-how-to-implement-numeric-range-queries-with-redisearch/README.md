# How to Implement Numeric Range Queries with RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Numeric Range, Search, Filtering

Description: Learn how to use RediSearch NUMERIC fields to filter documents by price ranges, dates, and other numeric criteria with high performance.

---

## Numeric Fields in RediSearch

RediSearch supports NUMERIC fields that enable range queries using the `@field:[min max]` syntax. Numeric indexes are stored as balanced binary search trees, giving O(log n) range lookup performance.

## Creating an Index with Numeric Fields

```bash
FT.CREATE idx:products
  ON HASH
  PREFIX 1 product:
  SCHEMA
    title TEXT
    category TAG
    price NUMERIC SORTABLE
    rating NUMERIC SORTABLE
    created_at NUMERIC SORTABLE
```

## Basic Range Query Syntax

```bash
# Products priced between $10 and $100
FT.SEARCH idx:products "@price:[10 100]"

# Exclusive bounds using ( prefix
FT.SEARCH idx:products "@price:[(10 (100]"

# Minimum only (no upper bound)
FT.SEARCH idx:products "@price:[50 +inf]"

# Maximum only (no lower bound)
FT.SEARCH idx:products "@price:[-inf 500]"
```

## Python Implementation

```python
from redis import Redis
from redis.commands.search.field import TextField, TagField, NumericField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query
import time

r = Redis(decode_responses=True)

def create_product_index():
    try:
        r.ft("idx:products").info()
    except Exception:
        r.ft("idx:products").create_index(
            [
                TextField("title", weight=3.0),
                TagField("category"),
                NumericField("price", sortable=True),
                NumericField("rating", sortable=True),
                NumericField("created_at", sortable=True),
            ],
            definition=IndexDefinition(
                prefix=["product:"],
                index_type=IndexType.HASH
            )
        )

def add_product(product_id: int, title: str, category: str,
                price: float, rating: float):
    r.hset(f"product:{product_id}", mapping={
        "title": title,
        "category": category,
        "price": price,
        "rating": rating,
        "created_at": int(time.time())
    })

def search_by_price_range(min_price: float, max_price: float,
                          limit: int = 20) -> list:
    q = Query(f"@price:[{min_price} {max_price}]") \
        .sort_by("price", asc=True) \
        .return_fields("title", "category", "price", "rating") \
        .paging(0, limit)
    results = r.ft("idx:products").search(q)
    return [
        {
            "id": doc.id.replace("product:", ""),
            "title": doc.title,
            "price": float(doc.price),
            "rating": float(doc.rating)
        }
        for doc in results.docs
    ]

def search_by_rating(min_rating: float = 4.0, limit: int = 10) -> list:
    q = Query(f"@rating:[{min_rating} 5.0]") \
        .sort_by("rating", asc=False) \
        .return_fields("title", "price", "rating") \
        .paging(0, limit)
    results = r.ft("idx:products").search(q)
    return [
        {"title": doc.title, "price": float(doc.price), "rating": float(doc.rating)}
        for doc in results.docs
    ]
```

## Combining Numeric and Text Filters

```python
def search_smartphones_under_budget(max_price: float, query: str = "") -> list:
    text_part = f"({query})" if query else "*"
    full_query = f"{text_part} @category:{{smartphones}} @price:[-inf {max_price}]"
    q = Query(full_query) \
        .sort_by("price", asc=True) \
        .return_fields("title", "price", "rating") \
        .paging(0, 20)
    results = r.ft("idx:products").search(q)
    return [
        {"title": doc.title, "price": float(doc.price)}
        for doc in results.docs
    ]
```

## Date Range Queries

Store dates as Unix timestamps to enable date-range filtering:

```python
def search_new_arrivals(days: int = 7) -> list:
    since = int(time.time()) - days * 86400
    q = Query(f"@created_at:[{since} +inf]") \
        .sort_by("created_at", asc=False) \
        .return_fields("title", "price", "created_at") \
        .paging(0, 20)
    results = r.ft("idx:products").search(q)
    return [
        {
            "title": doc.title,
            "price": float(doc.price),
            "created_at": int(doc.created_at)
        }
        for doc in results.docs
    ]
```

## Aggregation with Numeric Ranges

RediSearch's FT.AGGREGATE can compute statistics per range bucket:

```python
from redis.commands.search.aggregation import AggregateRequest, Asc
import redis.commands.search.reducers as reducers

def price_distribution() -> dict:
    request = AggregateRequest("*") \
        .apply(price_bucket="ceil(@price / 100) * 100") \
        .group_by("@price_bucket", reducers.count().alias("count")) \
        .sort_by(Asc("@price_bucket"))
    results = r.ft("idx:products").aggregate(request)
    return {row["price_bucket"]: int(row["count"]) for row in results.rows}
```

## Full API Example

```python
from fastapi import FastAPI

app = FastAPI()

@app.on_event("startup")
def startup():
    create_product_index()
    products = [
        (1, "iPhone 15", "smartphones", 999.0, 4.7),
        (2, "Galaxy S24", "smartphones", 799.0, 4.5),
        (3, "Pixel 8", "smartphones", 599.0, 4.4),
        (4, "MacBook Pro", "laptops", 2499.0, 4.8),
        (5, "Dell XPS 15", "laptops", 1799.0, 4.6),
    ]
    for args in products:
        add_product(*args)

@app.get("/products/range")
def price_range(min_price: float = 0, max_price: float = 9999):
    return search_by_price_range(min_price, max_price)
```

## Summary

RediSearch NUMERIC fields provide efficient range queries using a balanced BST index, supporting open-ended bounds with `+inf` and `-inf`. Combining numeric filters with TAG and TEXT filters in a single query enables faceted search patterns. Sorting by numeric fields returns results ordered by price, rating, or date without additional processing.
