# How to Cache Database Queries with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, Database, PostgreSQL, MySQL, Query Caching, Performance, Python, Node.js

Description: A comprehensive guide to caching database query results with Redis. Learn cache invalidation strategies, query result serialization, and practical patterns for PostgreSQL and MySQL.

---

> Database queries are often the slowest part of your application. Caching query results in Redis can reduce response times from hundreds of milliseconds to single-digit milliseconds, dramatically improving user experience and reducing database load.

Query caching stores the results of database queries in Redis, allowing subsequent identical queries to be served from cache without hitting the database.

---

## When to Cache Database Queries

### Good Candidates for Caching

- **Read-heavy data**: Queries executed frequently but data changes rarely
- **Expensive queries**: Complex joins, aggregations, or full-text searches
- **Reference data**: Country lists, categories, configuration
- **Computed results**: Aggregations, rankings, statistics

### Poor Candidates

- **Highly volatile data**: Real-time counters, live feeds
- **User-specific transactional data**: Shopping carts during checkout
- **Large result sets**: Results that exceed memory limits
- **Write-heavy patterns**: Data that changes on every request

---

## Basic Query Caching

### Python with SQLAlchemy

```python
import redis
import json
import hashlib
from typing import Any, Optional, Callable
from functools import wraps
from sqlalchemy.orm import Session
from sqlalchemy import text

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def cache_query(ttl: int = 300, prefix: str = "query"):
    """
    Decorator to cache database query results.

    Args:
        ttl: Time-to-live in seconds
        prefix: Cache key prefix
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from function name and arguments
            cache_key = build_query_cache_key(func.__name__, args, kwargs, prefix)

            # Try cache first
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            # Execute query
            result = func(*args, **kwargs)

            # Cache result
            if result is not None:
                redis_client.setex(cache_key, ttl, json.dumps(result, default=str))

            return result

        return wrapper
    return decorator

def build_query_cache_key(func_name: str, args: tuple, kwargs: dict, prefix: str) -> str:
    """Build deterministic cache key from query parameters"""
    # Serialize arguments
    key_data = {
        'func': func_name,
        'args': [str(arg) for arg in args if not isinstance(arg, Session)],
        'kwargs': {k: str(v) for k, v in kwargs.items()}
    }

    # Hash for consistent key length
    key_hash = hashlib.md5(json.dumps(key_data, sort_keys=True).encode()).hexdigest()

    return f"{prefix}:{func_name}:{key_hash}"

# Usage with SQLAlchemy
@cache_query(ttl=300, prefix="products")
def get_products_by_category(db: Session, category_id: int, limit: int = 10) -> list:
    """Fetch products by category with caching"""
    result = db.execute(
        text("""
            SELECT id, name, price, description
            FROM products
            WHERE category_id = :category_id
            ORDER BY created_at DESC
            LIMIT :limit
        """),
        {"category_id": category_id, "limit": limit}
    )

    return [dict(row._mapping) for row in result]

@cache_query(ttl=3600, prefix="categories")
def get_all_categories(db: Session) -> list:
    """Fetch all categories - longer TTL for reference data"""
    result = db.execute(text("SELECT id, name, slug FROM categories ORDER BY name"))
    return [dict(row._mapping) for row in result]

@cache_query(ttl=60, prefix="stats")
def get_product_statistics(db: Session, category_id: int) -> dict:
    """Fetch aggregated statistics"""
    result = db.execute(
        text("""
            SELECT
                COUNT(*) as total_products,
                AVG(price) as avg_price,
                MIN(price) as min_price,
                MAX(price) as max_price
            FROM products
            WHERE category_id = :category_id
        """),
        {"category_id": category_id}
    )

    row = result.fetchone()
    return dict(row._mapping)
```

### Node.js with Knex

```javascript
const Redis = require('redis');
const crypto = require('crypto');

const redis = Redis.createClient();
await redis.connect();

/**
 * Wrapper for caching database queries
 */
class QueryCache {
    constructor(options = {}) {
        this.defaultTTL = options.ttl || 300;
        this.prefix = options.prefix || 'query';
    }

    /**
     * Build cache key from query and parameters
     */
    buildKey(queryName, params) {
        const keyData = JSON.stringify({ queryName, params });
        const hash = crypto.createHash('md5').update(keyData).digest('hex');
        return `${this.prefix}:${queryName}:${hash}`;
    }

    /**
     * Execute query with caching
     */
    async cached(queryName, params, queryFn, ttl = this.defaultTTL) {
        const cacheKey = this.buildKey(queryName, params);

        // Try cache
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Execute query
        const result = await queryFn();

        // Cache result
        if (result !== null && result !== undefined) {
            await redis.setEx(cacheKey, ttl, JSON.stringify(result));
        }

        return result;
    }

    /**
     * Invalidate cached query
     */
    async invalidate(queryName, params) {
        const cacheKey = this.buildKey(queryName, params);
        await redis.del(cacheKey);
    }

    /**
     * Invalidate all queries matching pattern
     */
    async invalidatePattern(pattern) {
        const keys = await redis.keys(`${this.prefix}:${pattern}:*`);
        if (keys.length > 0) {
            await redis.del(keys);
        }
    }
}

const queryCache = new QueryCache({ prefix: 'db', ttl: 300 });

// Usage with Knex
async function getProductsByCategory(categoryId, limit = 10) {
    return queryCache.cached(
        'products_by_category',
        { categoryId, limit },
        async () => {
            return knex('products')
                .select('id', 'name', 'price', 'description')
                .where('category_id', categoryId)
                .orderBy('created_at', 'desc')
                .limit(limit);
        },
        300  // 5 minutes TTL
    );
}

async function getAllCategories() {
    return queryCache.cached(
        'all_categories',
        {},
        async () => {
            return knex('categories')
                .select('id', 'name', 'slug')
                .orderBy('name');
        },
        3600  // 1 hour TTL for reference data
    );
}

// Invalidate on update
async function updateProduct(productId, data) {
    await knex('products').where('id', productId).update(data);

    // Invalidate related queries
    const product = await knex('products').where('id', productId).first();
    await queryCache.invalidate('products_by_category', { categoryId: product.category_id });
}
```

---

## Advanced Caching Patterns

### Cached Repository Pattern

```python
from typing import Generic, TypeVar, Optional, List
from abc import ABC, abstractmethod
import json

T = TypeVar('T')

class CachedRepository(Generic[T], ABC):
    """Base class for repositories with caching"""

    def __init__(self, redis_client, db_session, cache_prefix: str, ttl: int = 300):
        self.redis = redis_client
        self.db = db_session
        self.cache_prefix = cache_prefix
        self.ttl = ttl

    @abstractmethod
    def _serialize(self, entity: T) -> str:
        """Serialize entity for caching"""
        pass

    @abstractmethod
    def _deserialize(self, data: str) -> T:
        """Deserialize entity from cache"""
        pass

    def _cache_key(self, identifier: str) -> str:
        return f"{self.cache_prefix}:{identifier}"

    def get_by_id(self, entity_id: int) -> Optional[T]:
        """Get entity by ID with caching"""
        cache_key = self._cache_key(f"id:{entity_id}")

        # Try cache
        cached = self.redis.get(cache_key)
        if cached:
            return self._deserialize(cached)

        # Fetch from database
        entity = self._fetch_by_id(entity_id)

        if entity:
            self.redis.setex(cache_key, self.ttl, self._serialize(entity))

        return entity

    def get_many_by_ids(self, entity_ids: List[int]) -> List[T]:
        """Get multiple entities with batch caching"""
        if not entity_ids:
            return []

        cache_keys = [self._cache_key(f"id:{id}") for id in entity_ids]

        # Batch get from cache
        cached_values = self.redis.mget(cache_keys)

        results = {}
        missing_ids = []

        for entity_id, cached in zip(entity_ids, cached_values):
            if cached:
                results[entity_id] = self._deserialize(cached)
            else:
                missing_ids.append(entity_id)

        # Fetch missing from database
        if missing_ids:
            entities = self._fetch_by_ids(missing_ids)

            # Cache fetched entities
            pipe = self.redis.pipeline()
            for entity in entities:
                cache_key = self._cache_key(f"id:{entity.id}")
                pipe.setex(cache_key, self.ttl, self._serialize(entity))
                results[entity.id] = entity
            pipe.execute()

        # Return in original order
        return [results.get(id) for id in entity_ids if id in results]

    def save(self, entity: T) -> T:
        """Save entity and update cache"""
        saved = self._save_to_database(entity)

        # Update cache
        cache_key = self._cache_key(f"id:{saved.id}")
        self.redis.setex(cache_key, self.ttl, self._serialize(saved))

        # Invalidate related query caches
        self._invalidate_query_caches(saved)

        return saved

    def delete(self, entity_id: int) -> bool:
        """Delete entity and invalidate cache"""
        entity = self.get_by_id(entity_id)

        if entity:
            self._delete_from_database(entity_id)
            self.redis.delete(self._cache_key(f"id:{entity_id}"))
            self._invalidate_query_caches(entity)
            return True

        return False

    @abstractmethod
    def _fetch_by_id(self, entity_id: int) -> Optional[T]:
        pass

    @abstractmethod
    def _fetch_by_ids(self, entity_ids: List[int]) -> List[T]:
        pass

    @abstractmethod
    def _save_to_database(self, entity: T) -> T:
        pass

    @abstractmethod
    def _delete_from_database(self, entity_id: int):
        pass

    @abstractmethod
    def _invalidate_query_caches(self, entity: T):
        pass

# Concrete implementation
class ProductRepository(CachedRepository):
    def __init__(self, redis_client, db_session):
        super().__init__(redis_client, db_session, "product", ttl=300)

    def _serialize(self, product) -> str:
        return json.dumps({
            'id': product.id,
            'name': product.name,
            'price': float(product.price),
            'category_id': product.category_id
        })

    def _deserialize(self, data: str):
        return Product(**json.loads(data))

    def _fetch_by_id(self, product_id: int):
        return self.db.query(Product).filter(Product.id == product_id).first()

    def _fetch_by_ids(self, product_ids: List[int]):
        return self.db.query(Product).filter(Product.id.in_(product_ids)).all()

    def _save_to_database(self, product):
        self.db.add(product)
        self.db.commit()
        return product

    def _delete_from_database(self, product_id: int):
        self.db.query(Product).filter(Product.id == product_id).delete()
        self.db.commit()

    def _invalidate_query_caches(self, product):
        # Invalidate category listing
        self.redis.delete(f"query:products_by_category:{product.category_id}")
        # Invalidate all products query
        self.redis.delete("query:all_products")

    # Query methods
    def find_by_category(self, category_id: int, limit: int = 10) -> List:
        cache_key = f"query:products_by_category:{category_id}:{limit}"

        cached = self.redis.get(cache_key)
        if cached:
            return [self._deserialize(p) for p in json.loads(cached)]

        products = (
            self.db.query(Product)
            .filter(Product.category_id == category_id)
            .limit(limit)
            .all()
        )

        # Cache query result
        serialized = [self._serialize(p) for p in products]
        self.redis.setex(cache_key, self.ttl, json.dumps(serialized))

        return products
```

### Query Hash with Automatic Invalidation

```python
class SmartQueryCache:
    """
    Query cache that tracks table dependencies for automatic invalidation.
    """

    def __init__(self, redis_client):
        self.redis = redis_client

    def cache_query(
        self,
        query_name: str,
        params: dict,
        result: Any,
        ttl: int,
        tables: List[str]
    ):
        """Cache query result and track table dependencies"""
        cache_key = self._query_key(query_name, params)

        # Store result
        self.redis.setex(cache_key, ttl, json.dumps(result, default=str))

        # Track which tables this query depends on
        for table in tables:
            self.redis.sadd(f"table_queries:{table}", cache_key)
            self.redis.expire(f"table_queries:{table}", ttl)

    def get_cached(self, query_name: str, params: dict) -> Optional[Any]:
        """Get cached query result"""
        cache_key = self._query_key(query_name, params)
        cached = self.redis.get(cache_key)
        return json.loads(cached) if cached else None

    def invalidate_table(self, table_name: str):
        """Invalidate all queries that depend on a table"""
        table_key = f"table_queries:{table_name}"
        query_keys = self.redis.smembers(table_key)

        if query_keys:
            self.redis.delete(*query_keys)
        self.redis.delete(table_key)

    def _query_key(self, query_name: str, params: dict) -> str:
        params_hash = hashlib.md5(
            json.dumps(params, sort_keys=True).encode()
        ).hexdigest()
        return f"query:{query_name}:{params_hash}"

# Usage
cache = SmartQueryCache(redis_client)

def get_order_summary(user_id: int) -> dict:
    cached = cache.get_cached('order_summary', {'user_id': user_id})
    if cached:
        return cached

    result = db.execute("""
        SELECT
            COUNT(*) as total_orders,
            SUM(total) as total_spent,
            AVG(total) as avg_order
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = :user_id
    """, {'user_id': user_id}).fetchone()

    summary = dict(result._mapping)

    # Cache with table dependencies
    cache.cache_query(
        'order_summary',
        {'user_id': user_id},
        summary,
        ttl=300,
        tables=['orders', 'order_items']  # Depends on these tables
    )

    return summary

# When orders table is modified
def on_order_created(order):
    cache.invalidate_table('orders')
    cache.invalidate_table('order_items')
```

---

## Cache Invalidation Strategies

### Write-Through with Cache Update

```python
class WriteThoughQueryCache:
    """Update cache on every write"""

    def update_product(self, product_id: int, data: dict):
        # Update database
        updated = db.execute(
            text("UPDATE products SET name=:name, price=:price WHERE id=:id"),
            {**data, 'id': product_id}
        )
        db.commit()

        # Update individual product cache
        product = self.get_product_by_id(product_id)
        cache_key = f"product:{product_id}"
        redis_client.setex(cache_key, 300, json.dumps(product))

        # Refresh query caches that might include this product
        self._refresh_affected_queries(product)

    def _refresh_affected_queries(self, product):
        # Re-run and cache affected queries
        self.get_products_by_category(product['category_id'])
        self.get_featured_products()
```

### Time-Based Invalidation with Stale-While-Revalidate

```python
import threading
import time

class StaleWhileRevalidateCache:
    """
    Serve stale data while refreshing in background.
    Prevents cache stampede and ensures low latency.
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self.revalidating = set()

    def get_or_refresh(
        self,
        cache_key: str,
        fetch_fn: Callable,
        ttl: int = 300,
        stale_ttl: int = 600
    ) -> Any:
        """
        Get cached value, refreshing in background if stale.

        Args:
            cache_key: Redis key
            fetch_fn: Function to fetch fresh data
            ttl: Fresh data TTL
            stale_ttl: How long stale data is acceptable
        """
        # Try to get cached data
        cached = self.redis.hgetall(cache_key)

        if cached:
            data = json.loads(cached.get('data', '{}'))
            cached_at = float(cached.get('cached_at', 0))
            age = time.time() - cached_at

            # Data is fresh
            if age < ttl:
                return data

            # Data is stale but acceptable - return and refresh in background
            if age < stale_ttl:
                self._background_refresh(cache_key, fetch_fn, ttl)
                return data

        # Cache miss or data too old - fetch synchronously
        return self._fetch_and_cache(cache_key, fetch_fn, ttl)

    def _fetch_and_cache(self, cache_key: str, fetch_fn: Callable, ttl: int) -> Any:
        """Fetch data and cache it"""
        data = fetch_fn()

        self.redis.hset(cache_key, mapping={
            'data': json.dumps(data, default=str),
            'cached_at': str(time.time())
        })
        self.redis.expire(cache_key, ttl * 2)  # Keep slightly longer for stale reads

        return data

    def _background_refresh(self, cache_key: str, fetch_fn: Callable, ttl: int):
        """Refresh cache in background thread"""
        # Prevent multiple concurrent refreshes
        if cache_key in self.revalidating:
            return

        self.revalidating.add(cache_key)

        def refresh():
            try:
                self._fetch_and_cache(cache_key, fetch_fn, ttl)
            finally:
                self.revalidating.discard(cache_key)

        thread = threading.Thread(target=refresh, daemon=True)
        thread.start()

# Usage
cache = StaleWhileRevalidateCache(redis_client)

def get_dashboard_stats():
    return cache.get_or_refresh(
        'dashboard:stats',
        fetch_fn=lambda: compute_expensive_statistics(),
        ttl=60,       # Fresh for 1 minute
        stale_ttl=300 # Acceptable stale for 5 minutes
    )
```

---

## Handling Large Result Sets

### Pagination with Caching

```python
def get_paginated_products(
    category_id: int,
    page: int = 1,
    per_page: int = 20
) -> dict:
    """Cache each page separately"""
    cache_key = f"products:category:{category_id}:page:{page}:size:{per_page}"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    offset = (page - 1) * per_page

    # Fetch page
    products = db.execute(
        text("""
            SELECT id, name, price
            FROM products
            WHERE category_id = :category_id
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        {'category_id': category_id, 'limit': per_page, 'offset': offset}
    ).fetchall()

    # Get total count (cache separately)
    total = get_category_product_count(category_id)

    result = {
        'items': [dict(row._mapping) for row in products],
        'page': page,
        'per_page': per_page,
        'total': total,
        'pages': (total + per_page - 1) // per_page
    }

    redis_client.setex(cache_key, 300, json.dumps(result))

    return result

def get_category_product_count(category_id: int) -> int:
    """Cache count separately - often more stable than pages"""
    cache_key = f"products:category:{category_id}:count"

    cached = redis_client.get(cache_key)
    if cached:
        return int(cached)

    count = db.execute(
        text("SELECT COUNT(*) FROM products WHERE category_id = :category_id"),
        {'category_id': category_id}
    ).scalar()

    redis_client.setex(cache_key, 600, str(count))

    return count
```

### Cursor-Based Pagination Cache

```python
def get_products_cursor(
    category_id: int,
    cursor: Optional[str] = None,
    limit: int = 20
) -> dict:
    """
    Cursor-based pagination with caching.
    More efficient for large datasets.
    """
    cache_key = f"products:category:{category_id}:cursor:{cursor or 'start'}:limit:{limit}"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Decode cursor (last seen ID)
    last_id = int(cursor) if cursor else 0

    products = db.execute(
        text("""
            SELECT id, name, price, created_at
            FROM products
            WHERE category_id = :category_id
              AND id > :last_id
            ORDER BY id ASC
            LIMIT :limit
        """),
        {'category_id': category_id, 'last_id': last_id, 'limit': limit + 1}
    ).fetchall()

    products_list = [dict(row._mapping) for row in products]

    # Determine if there are more results
    has_more = len(products_list) > limit
    if has_more:
        products_list = products_list[:limit]

    result = {
        'items': products_list,
        'next_cursor': str(products_list[-1]['id']) if has_more else None,
        'has_more': has_more
    }

    redis_client.setex(cache_key, 300, json.dumps(result, default=str))

    return result
```

---

## Best Practices

### 1. Use Appropriate Serialization

```python
import pickle
import msgpack

# JSON - human readable, widely compatible
def cache_json(key, data, ttl):
    redis_client.setex(key, ttl, json.dumps(data, default=str))

# MessagePack - faster, smaller than JSON
def cache_msgpack(key, data, ttl):
    redis_client.setex(key, ttl, msgpack.packb(data))

# Pickle - Python objects, but security risk
def cache_pickle(key, data, ttl):
    redis_client.setex(key, ttl, pickle.dumps(data))
```

### 2. Handle None Results

```python
def get_user(user_id: int) -> Optional[dict]:
    cache_key = f"user:{user_id}"
    cached = redis_client.get(cache_key)

    if cached == "NULL":
        return None  # Cached negative result

    if cached:
        return json.loads(cached)

    user = fetch_user_from_database(user_id)

    if user:
        redis_client.setex(cache_key, 300, json.dumps(user))
    else:
        # Cache negative result to prevent repeated DB lookups
        redis_client.setex(cache_key, 60, "NULL")

    return user
```

### 3. Monitor Cache Effectiveness

```python
from prometheus_client import Counter, Histogram

query_cache_hits = Counter('query_cache_hits_total', 'Query cache hits', ['query'])
query_cache_misses = Counter('query_cache_misses_total', 'Query cache misses', ['query'])
query_latency = Histogram('query_latency_seconds', 'Query latency', ['query', 'source'])

def cached_query_with_metrics(query_name: str, cache_key: str, fetch_fn: Callable, ttl: int):
    # Check cache
    with query_latency.labels(query=query_name, source='cache').time():
        cached = redis_client.get(cache_key)

    if cached:
        query_cache_hits.labels(query=query_name).inc()
        return json.loads(cached)

    query_cache_misses.labels(query=query_name).inc()

    # Fetch from database
    with query_latency.labels(query=query_name, source='database').time():
        result = fetch_fn()

    if result is not None:
        redis_client.setex(cache_key, ttl, json.dumps(result, default=str))

    return result
```

---

## Conclusion

Database query caching with Redis can dramatically improve application performance:

- **Reduce database load** by serving repeated queries from cache
- **Decrease latency** from hundreds of milliseconds to single-digit milliseconds
- **Scale read-heavy workloads** without scaling your database

Key takeaways:
- Cache queries that are read-heavy and don't change frequently
- Implement robust invalidation strategies based on your data patterns
- Use appropriate TTLs - too short wastes cache, too long serves stale data
- Monitor cache hit rates to ensure effectiveness

---

*Need to monitor your database and caching layer? [OneUptime](https://oneuptime.com) provides comprehensive monitoring with query performance tracking, cache hit ratios, and database health alerts.*
