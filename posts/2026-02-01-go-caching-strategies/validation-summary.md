# Validation Summary: How to Implement Caching Strategies in Go Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (standard library: `sync.Map`, `container/list`, `database/sql`, `context`, `encoding/json`)
- Redis (via `github.com/redis/go-redis/v9`)
- Caching patterns: in-memory TTL cache, LRU cache, cache-aside, write-through, cache invalidation, cache stampede protection (single-flight)

## Sources Consulted
- Go standard library docs: `sync.Map` — https://pkg.go.dev/sync#Map
- Go standard library docs: `container/list` — https://pkg.go.dev/container/list
- Go standard library docs: `time.Ticker` — https://pkg.go.dev/time#Ticker
- Go `database/sql` package — https://pkg.go.dev/database/sql
- go-redis v9 package docs — https://pkg.go.dev/github.com/redis/go-redis/v9
- go-redis `Options` struct fields (Addr, Password, DB, PoolSize, MinIdleConns, DialTimeout, ReadTimeout, WriteTimeout) — https://pkg.go.dev/github.com/redis/go-redis/v9#Options
- go-redis `redis.Nil` sentinel — https://pkg.go.dev/github.com/redis/go-redis/v9#pkg-variables
- go-redis `SCAN` / `Client.Scan` signature `(ctx, cursor, match, count)` returning `(keys []string, cursor uint64, err error)` — https://pkg.go.dev/github.com/redis/go-redis/v9#Client.Scan
- Redis SCAN vs KEYS guidance — https://redis.io/commands/scan/

## Issues Found
- **Bug in `StampedeProtectedCache.GetOrCompute`**: after computing a fresh value and storing it in the cache via `c.cache.Set(...)`, the function returned `nil` without populating the `target` parameter. The very caller that triggered the computation would have received an unpopulated `target`. Fixed by re-reading the value from the cache into `target` (`c.cache.Get(ctx, key, target)`) right after the successful `Set`, so the contract that `target` is filled in matches the cache-hit path. The fix preserves the function's signature, single-flight semantics, and writing style.

## Review Notes
- The `StampedeProtectedCache` and `MetricsCache` structs are presented without explicit constructors. The `locks` map in `StampedeProtectedCache` must be initialized (e.g., `locks: make(map[string]*sync.Mutex)`) before use — otherwise `c.locks[key] = lock` panics on a nil map. This is consistent with how the post presents these as illustrative snippets, and the other types in the post (e.g., `InMemoryCache`, `LRUCache`, `RedisCache`, `UserRepository`) do show constructors. Readers adding these snippets to real code should add a `NewStampedeProtectedCache`/`NewMetricsCache` constructor that initializes the map.
- The `locks` map in `StampedeProtectedCache` grows without bound — there is no cleanup of the per-key mutexes after use. For long-running services with high key cardinality this can leak memory. Using `golang.org/x/sync/singleflight` would be a more production-grade alternative (it automatically cleans up in-flight entries), but the mutex-map approach shown is a valid teaching example.
- The cleanup goroutine in `InMemoryCache.startCleanup` runs forever and has no `Stop()` mechanism; the ticker is never explicitly stopped. In long-lived programs this is fine, but the goroutine and ticker will not be garbage collected if the cache itself becomes unreachable (the goroutine keeps a reference to the cache). A `Close()` / `Stop()` method would be a sensible production addition but is outside the scope of the tutorial's goals.
- The `LRUCache.Get` uses `mu.Lock()` (write lock) because it mutates the list via `MoveToFront`. That is correct — `RWMutex` is used but only the write lock is taken in `Get`/`Set`. The `RWMutex` choice over `Mutex` is slightly unusual since only `Len` uses the read lock, but it is not incorrect.
- The "double-delete" invalidation pattern (delete from cache, write DB, delete from cache again) is a recognized real-world pattern; it reduces but does not fully eliminate races. The post correctly notes this is for handling races during the database operation.
- go-redis import path `github.com/redis/go-redis/v9` is the current canonical module (the older `github.com/go-redis/redis/v8` is superseded). This is correct as of the post's date.
- All Redis client API calls (`Set(...).Err()`, `Get(...).Bytes()`, `Del(ctx, keys...).Err()`, `Scan(...).Result()`, `Close()`) and the `redis.Nil` sentinel check match the go-redis v9 API.
