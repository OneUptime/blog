# How to Use Redis as a Cache in Go Web Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Caching

Description: Learn how to implement Redis caching in Go web applications with the cache-aside pattern, TTL management, and cache invalidation strategies.

---

Redis is a fast in-memory store that works well as a caching layer in front of a database. In Go web applications, the cache-aside (lazy loading) pattern is the most common approach: check the cache first, fall back to the database on a miss, and populate the cache for next time.

## Cache Service

```go
package cache

import (
    "context"
    "encoding/json"
    "errors"
    "time"

    "github.com/redis/go-redis/v9"
)

type Cache struct {
    rdb *redis.Client
    ttl time.Duration
}

func New(rdb *redis.Client, ttl time.Duration) *Cache {
    return &Cache{rdb: rdb, ttl: ttl}
}

func (c *Cache) Get(ctx context.Context, key string, dest interface{}) (bool, error) {
    val, err := c.rdb.Get(ctx, key).Result()
    if errors.Is(err, redis.Nil) {
        return false, nil // cache miss
    }
    if err != nil {
        return false, err
    }
    return true, json.Unmarshal([]byte(val), dest)
}

func (c *Cache) Set(ctx context.Context, key string, value interface{}) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    return c.rdb.Set(ctx, key, data, c.ttl).Err()
}

func (c *Cache) Delete(ctx context.Context, key string) error {
    return c.rdb.Del(ctx, key).Err()
}

func (c *Cache) DeletePattern(ctx context.Context, pattern string) error {
    keys, err := c.rdb.Keys(ctx, pattern).Result()
    if err != nil || len(keys) == 0 {
        return err
    }
    return c.rdb.Del(ctx, keys...).Err()
}
```

## Cache-Aside Pattern

```go
type Product struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Price float64 `json:"price"`
}

type ProductService struct {
    db    *sql.DB
    cache *cache.Cache
}

func (s *ProductService) GetProduct(ctx context.Context, id int) (*Product, error) {
    key := fmt.Sprintf("product:%d", id)
    var product Product

    // Check cache first
    found, err := s.cache.Get(ctx, key, &product)
    if err != nil {
        return nil, err
    }
    if found {
        return &product, nil // cache hit
    }

    // Cache miss - fetch from database
    if err := s.db.QueryRowContext(ctx,
        "SELECT id, name, price FROM products WHERE id = $1", id,
    ).Scan(&product.ID, &product.Name, &product.Price); err != nil {
        return nil, err
    }

    // Store in cache for next time
    s.cache.Set(ctx, key, product)
    return &product, nil
}
```

## Cache Invalidation on Update

```go
func (s *ProductService) UpdateProduct(ctx context.Context, id int, name string, price float64) error {
    _, err := s.db.ExecContext(ctx,
        "UPDATE products SET name=$1, price=$2 WHERE id=$3", name, price, id)
    if err != nil {
        return err
    }
    // Invalidate cached entry
    return s.cache.Delete(ctx, fmt.Sprintf("product:%d", id))
}
```

## HTTP Handler with Caching

```go
func ProductHandler(svc *ProductService) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        idStr := r.PathValue("id")
        id, _ := strconv.Atoi(idStr)

        product, err := svc.GetProduct(r.Context(), id)
        if err != nil {
            http.Error(w, "Not Found", 404)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(product)
    }
}
```

## Caching List Responses

```go
func (s *ProductService) ListProducts(ctx context.Context, category string) ([]Product, error) {
    key := "products:list:" + category
    var products []Product

    found, err := s.cache.Get(ctx, key, &products)
    if err != nil || found {
        return products, err
    }

    rows, err := s.db.QueryContext(ctx,
        "SELECT id, name, price FROM products WHERE category=$1", category)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    for rows.Next() {
        var p Product
        rows.Scan(&p.ID, &p.Name, &p.Price)
        products = append(products, p)
    }

    s.cache.Set(ctx, key, products)
    return products, nil
}
```

## Summary

The cache-aside pattern in Go checks Redis first, falls back to the database on a miss, and writes the result back to Redis. Cache invalidation on writes prevents stale data. Encoding values as JSON keeps the cache portable and avoids binary serialization complexity. Always handle `redis.Nil` (cache miss) separately from real connection errors so application logic degrades gracefully if Redis is unavailable.
