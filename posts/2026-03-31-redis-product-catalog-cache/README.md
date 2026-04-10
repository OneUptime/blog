# How to Build a Product Catalog Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Hash, E-Commerce

Description: Cache your product catalog in Redis using Hashes for individual products and Sorted Sets for category listings - reduce database load and serve catalog pages in under 5ms.

---

Product catalog data is read far more often than it is written. Redis caching reduces database load and cuts response times from hundreds of milliseconds to single digits.

## Data Model

```text
product:{productId}          -> Hash: name, price, description, sku, stock_status
category:{categoryId}:products -> Sorted Set: productId -> price (for price sorting)
product:search:{keyword}     -> Set: matching productIds (for simple keyword search)
```

## Caching a Single Product

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

PRODUCT_TTL = 3600  # 1 hour

def cache_product(product):
    key = f"product:{product['id']}"
    pipe = r.pipeline()
    pipe.hset(key, mapping={
        "id": product["id"],
        "name": product["name"],
        "price": str(product["price"]),
        "description": product["description"],
        "sku": product["sku"],
        "stock_status": product["stock_status"],
        "category_id": product["category_id"],
    })
    pipe.expire(key, PRODUCT_TTL)
    pipe.execute()

def get_product(product_id):
    data = r.hgetall(f"product:{product_id}")
    if data:
        data["price"] = float(data["price"])
    return data or None
```

## Cache-Aside Pattern

```python
def get_product_with_fallback(product_id, db_fetch_fn):
    cached = get_product(product_id)
    if cached:
        return cached
    # Cache miss - fetch from DB
    product = db_fetch_fn(product_id)
    if product:
        cache_product(product)
    return product
```

## Category Product Listings

Store products per category in a Sorted Set, scored by price for easy sorting:

```python
def index_product_in_category(product_id, category_id, price):
    r.zadd(f"category:{category_id}:products", {product_id: price})

def get_category_products(category_id, min_price=0, max_price=float('inf'),
                          offset=0, limit=20, order="asc"):
    key = f"category:{category_id}:products"
    if order == "asc":
        ids = r.zrangebyscore(key, min_price, max_price, start=offset, num=limit)
    else:
        ids = r.zrevrangebyscore(key, max_price, min_price, start=offset, num=limit)
    return ids
```

## Batch Product Fetch

Retrieve multiple products in a single round trip:

```python
def get_products_batch(product_ids):
    pipe = r.pipeline()
    for pid in product_ids:
        pipe.hgetall(f"product:{pid}")
    results = pipe.execute()
    products = []
    for p in results:
        if p:
            p["price"] = float(p["price"])
            products.append(p)
    return products
```

## Invalidating the Cache on Update

```python
def invalidate_product(product_id):
    r.delete(f"product:{product_id}")

def update_product_price(product_id, new_price):
    key = f"product:{product_id}"
    if r.exists(key):
        r.hset(key, "price", str(new_price))
    # Update sorted sets in all categories that include this product
    category_id = r.hget(key, "category_id")
    if category_id:
        r.zadd(f"category:{category_id}:products", {product_id: new_price})
```

## Example Usage

```bash
# Store product
HSET product:101 name "Wireless Headphones" price "49.99" stock_status "in_stock"
EXPIRE product:101 3600

# Index in category
ZADD category:electronics:products 49.99 101

# Fetch products in price range $10-$100
ZRANGEBYSCORE category:electronics:products 10 100 LIMIT 0 20
```

## Summary

Caching your product catalog in Redis with Hashes and Sorted Sets dramatically reduces database load while enabling flexible sorting and filtering. The cache-aside pattern keeps data fresh by invalidating on updates. For catalog sizes exceeding Redis memory limits, use key expiry with appropriate TTLs to keep only the most-accessed products in cache.
