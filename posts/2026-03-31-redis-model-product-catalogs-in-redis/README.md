# How to Model Product Catalogs in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Product Catalog, E-Commerce, Data Modeling, Caching

Description: Model e-commerce product catalogs in Redis using hashes, sorted sets, and sets for fast product lookup, filtering, faceted search, and price sorting.

---

## Overview

Product catalogs require fast reads across multiple access patterns: lookup by ID, filter by category, sort by price, and faceted search. Redis provides the ideal building blocks for caching and serving catalog data with sub-millisecond response times.

## Storing Products as Hashes

Each product is stored as a Redis hash:

```bash
HSET product:1001 name "Wireless Headphones" price "49.99" category "electronics" brand "SoundCo" stock "250" rating "4.5"
HSET product:1002 name "Running Shoes" price "89.99" category "footwear" brand "SpeedFit" stock "80" rating "4.7"
HSET product:1003 name "Coffee Maker" price "34.99" category "kitchen" brand "BrewMaster" stock "120" rating "4.2"
```

Retrieve a product:

```bash
HGETALL product:1001
```

Get a specific field:

```bash
HGET product:1001 price
```

## Category Indexes with Sets

Use sets to track which products belong to each category:

```bash
SADD category:electronics 1001 1004 1005
SADD category:footwear 1002 1006
SADD category:kitchen 1003 1007 1008
```

Get all products in a category:

```bash
SMEMBERS category:electronics
```

Find products in multiple categories (intersection for cross-category search):

```bash
SINTER category:electronics category:sale
```

## Price Sorting with Sorted Sets

Use sorted sets to enable price-based sorting and range queries:

```bash
ZADD products:by_price 49.99 1001
ZADD products:by_price 89.99 1002
ZADD products:by_price 34.99 1003
```

Get products sorted by price (cheapest first):

```bash
ZRANGE products:by_price 0 -1 WITHSCORES
```

Get products in a price range ($30-$60):

```bash
ZRANGEBYSCORE products:by_price 30 60 WITHSCORES
```

## Rating-Based Sorted Set

```bash
ZADD products:by_rating 4.5 1001
ZADD products:by_rating 4.7 1002
ZADD products:by_rating 4.2 1003

# Top 3 highest rated
ZREVRANGE products:by_rating 0 2 WITHSCORES
```

## Faceted Search

Combine sets to implement faceted filtering:

```bash
# Tag products by brand
SADD brand:SoundCo 1001
SADD brand:SpeedFit 1002
SADD brand:BrewMaster 1003

# Electronics from SoundCo
SINTER category:electronics brand:SoundCo
```

## Python Example - Product Catalog Service

```python
import redis

r = redis.Redis(decode_responses=True)

def add_product(product_id, data):
    r.hset(f"product:{product_id}", mapping=data)
    r.sadd(f"category:{data['category']}", product_id)
    r.sadd(f"brand:{data['brand']}", product_id)
    r.zadd("products:by_price", {str(product_id): float(data['price'])})
    r.zadd("products:by_rating", {str(product_id): float(data['rating'])})

def get_product(product_id):
    return r.hgetall(f"product:{product_id}")

def search_by_category_and_brand(category, brand):
    product_ids = r.sinter(f"category:{category}", f"brand:{brand}")
    return [r.hgetall(f"product:{pid}") for pid in product_ids]

def get_products_by_price_range(min_price, max_price):
    product_ids = r.zrangebyscore("products:by_price", min_price, max_price)
    return [r.hgetall(f"product:{pid}") for pid in product_ids]

add_product("1001", {
    "name": "Wireless Headphones",
    "price": "49.99",
    "category": "electronics",
    "brand": "SoundCo",
    "stock": "250",
    "rating": "4.5"
})

print(get_product("1001"))
print(get_products_by_price_range(30, 60))
```

## Inventory Tracking

```bash
# Decrement stock atomically
HINCRBY product:1001 stock -1

# Check if in stock
HGET product:1001 stock
```

## Product TTL for Flash Sales

```bash
# Set product as available for 2 hours (flash sale)
SET product:flash:2001 "1001" EX 7200
```

## Caching Full Catalog Pages

Cache rendered category pages to avoid repeated lookups:

```bash
SET cache:category:electronics:page:1 "<serialized-product-list>" EX 300
```

## Summary

Redis models product catalogs using hashes for product data, sets for category and brand indexes, and sorted sets for price and rating ordering. This combination enables fast faceted search by intersecting sets and efficient range queries with sorted sets. Caching rendered pages with a short TTL reduces repeated lookups and delivers sub-millisecond catalog responses.
