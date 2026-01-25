# How to Reduce API Latency with Request Coalescing in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Performance, API, Request Coalescing, Optimization

Description: Learn how to dramatically reduce API latency and backend load by implementing request coalescing in Go, a technique that deduplicates concurrent requests for the same resource.

---

If your API serves the same data to many clients simultaneously, you're probably making duplicate database queries or external API calls. Request coalescing (also called request deduplication or singleflight) solves this by ensuring only one request actually executes while others wait for the same result. This pattern can reduce latency and backend load significantly, especially under high concurrency.

## The Problem: Duplicate Work

Imagine an endpoint that fetches user profile data. When 100 clients request the same user profile at the same time, you end up with 100 identical database queries. Your database does the same work 100 times, and 99 of those queries are wasted effort.

Here's what typically happens without coalescing:

```go
// Without coalescing - every request hits the database
func (s *Server) GetUserProfile(userID string) (*UserProfile, error) {
    // If 100 requests come in for the same userID simultaneously,
    // this query runs 100 times
    return s.db.QueryUserProfile(userID)
}
```

## What is Request Coalescing?

Request coalescing groups concurrent requests for the same resource so that only one request actually executes. All other requests wait for that single execution to complete and share the result.

The key insight: if multiple goroutines need the same data at the same time, only one should fetch it.

## Using the singleflight Package

Go's `golang.org/x/sync/singleflight` package provides a production-ready implementation. It's battle-tested and handles edge cases you might miss in a custom implementation.

Install it first:

```bash
go get golang.org/x/sync/singleflight
```

Here's the basic usage pattern:

```go
package main

import (
    "fmt"
    "sync"
    "time"

    "golang.org/x/sync/singleflight"
)

type UserService struct {
    // Group manages in-flight requests
    // Requests with the same key share results
    group singleflight.Group
    db    *Database
}

func (s *UserService) GetUserProfile(userID string) (*UserProfile, error) {
    // The key determines which requests get coalesced
    // Same userID = same key = shared result
    result, err, shared := s.group.Do(userID, func() (interface{}, error) {
        fmt.Printf("Actually fetching user %s from database\n", userID)
        return s.db.QueryUserProfile(userID)
    })

    if err != nil {
        return nil, err
    }

    // shared is true if this result came from another goroutine's request
    if shared {
        fmt.Printf("Request for user %s shared result with other callers\n", userID)
    }

    return result.(*UserProfile), nil
}
```

## Demonstrating the Effect

Let's see the difference in practice. This example simulates 50 concurrent requests for the same user:

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
    "time"

    "golang.org/x/sync/singleflight"
)

// Track how many times we actually hit the database
var dbQueryCount int64

func simulateDBQuery(userID string) (string, error) {
    atomic.AddInt64(&dbQueryCount, 1)
    // Simulate database latency
    time.Sleep(100 * time.Millisecond)
    return fmt.Sprintf("Profile data for %s", userID), nil
}

func main() {
    var group singleflight.Group
    var wg sync.WaitGroup

    userID := "user-123"
    numRequests := 50

    start := time.Now()

    // Fire 50 concurrent requests for the same user
    for i := 0; i < numRequests; i++ {
        wg.Add(1)
        go func(requestNum int) {
            defer wg.Done()

            result, _, shared := group.Do(userID, func() (interface{}, error) {
                return simulateDBQuery(userID)
            })

            fmt.Printf("Request %d got result, shared=%v\n", requestNum, shared)
            _ = result
        }(i)
    }

    wg.Wait()
    elapsed := time.Since(start)

    fmt.Printf("\nResults:\n")
    fmt.Printf("Total requests: %d\n", numRequests)
    fmt.Printf("Actual DB queries: %d\n", dbQueryCount)
    fmt.Printf("Total time: %v\n", elapsed)
}
```

Output will show that despite 50 requests, the database was queried only once, and total time was around 100ms instead of the 5 seconds it would take sequentially.

## Handling Different Request Types

Real APIs often have multiple endpoints that could benefit from coalescing. Use different singleflight groups or prefixed keys:

```go
type APIServer struct {
    userGroup    singleflight.Group
    productGroup singleflight.Group
    configGroup  singleflight.Group
}

// Each resource type uses its own group to avoid key collisions
func (s *APIServer) GetUser(id string) (*User, error) {
    result, err, _ := s.userGroup.Do(id, func() (interface{}, error) {
        return s.fetchUser(id)
    })
    if err != nil {
        return nil, err
    }
    return result.(*User), nil
}

func (s *APIServer) GetProduct(id string) (*Product, error) {
    result, err, _ := s.productGroup.Do(id, func() (interface{}, error) {
        return s.fetchProduct(id)
    })
    if err != nil {
        return nil, err
    }
    return result.(*Product), nil
}

// For complex queries, include all parameters in the key
func (s *APIServer) SearchProducts(query string, page int) (*SearchResult, error) {
    key := fmt.Sprintf("%s:page:%d", query, page)
    result, err, _ := s.productGroup.Do(key, func() (interface{}, error) {
        return s.searchProducts(query, page)
    })
    if err != nil {
        return nil, err
    }
    return result.(*SearchResult), nil
}
```

## Combining with Caching

Request coalescing and caching serve different purposes. Coalescing handles concurrent requests for the same resource. Caching handles sequential requests over time. Use both for maximum efficiency:

```go
type CachedUserService struct {
    group singleflight.Group
    cache *Cache
    db    *Database
}

func (s *CachedUserService) GetUser(userID string) (*User, error) {
    // First, check the cache
    if cached, found := s.cache.Get(userID); found {
        return cached.(*User), nil
    }

    // Cache miss - use singleflight to prevent duplicate DB queries
    // from concurrent cache misses
    result, err, _ := s.group.Do(userID, func() (interface{}, error) {
        // Double-check cache inside singleflight
        // Another goroutine might have populated it
        if cached, found := s.cache.Get(userID); found {
            return cached, nil
        }

        user, err := s.db.QueryUser(userID)
        if err != nil {
            return nil, err
        }

        // Populate cache for future requests
        s.cache.Set(userID, user, 5*time.Minute)
        return user, nil
    })

    if err != nil {
        return nil, err
    }
    return result.(*User), nil
}
```

## Error Handling Considerations

When using singleflight, errors are also shared. If the underlying operation fails, all waiting callers receive the same error. This is usually what you want, but be aware of it:

```go
func (s *Service) GetData(key string) ([]byte, error) {
    result, err, shared := s.group.Do(key, func() (interface{}, error) {
        data, err := s.fetchFromRemote(key)
        if err != nil {
            // This error will be returned to ALL waiting callers
            return nil, fmt.Errorf("fetch failed: %w", err)
        }
        return data, nil
    })

    if err != nil {
        // Log whether this error was from our call or shared
        if shared {
            log.Printf("Received shared error for key %s: %v", key, err)
        }
        return nil, err
    }

    return result.([]byte), nil
}
```

## Forget: Handling Retries

The `Forget` method removes a key from the in-flight map, allowing a new request to start even if one is in progress. This is useful for retry scenarios:

```go
func (s *Service) GetDataWithRetry(key string) ([]byte, error) {
    var lastErr error

    for attempt := 0; attempt < 3; attempt++ {
        result, err, _ := s.group.Do(key, func() (interface{}, error) {
            return s.fetchFromRemote(key)
        })

        if err == nil {
            return result.([]byte), nil
        }

        lastErr = err

        // Forget the key so the next attempt starts fresh
        // Without this, retries would share the failed result
        s.group.Forget(key)

        time.Sleep(time.Duration(attempt+1) * 100 * time.Millisecond)
    }

    return nil, fmt.Errorf("all retries failed: %w", lastErr)
}
```

## DoChan for Non-Blocking Calls

The `DoChan` method returns a channel instead of blocking. This is useful when you want to set a timeout or select between multiple operations:

```go
func (s *Service) GetDataWithTimeout(key string, timeout time.Duration) ([]byte, error) {
    ch := s.group.DoChan(key, func() (interface{}, error) {
        return s.fetchFromRemote(key)
    })

    select {
    case result := <-ch:
        if result.Err != nil {
            return nil, result.Err
        }
        return result.Val.([]byte), nil
    case <-time.After(timeout):
        // Timeout - but note the operation continues in the background
        // Other callers waiting on the same key will still get the result
        return nil, fmt.Errorf("timeout after %v", timeout)
    }
}
```

## Common Pitfalls

There are a few things to watch out for when implementing request coalescing:

**Key collisions**: Make sure your keys are unique across different resource types. Using separate singleflight groups or prefixed keys prevents accidental collisions.

**Long-running operations**: If the coalesced operation takes a long time, all callers wait. Consider adding timeouts using `DoChan` for operations that might hang.

**Memory for keys**: Keys are kept in memory while requests are in flight. For extremely high cardinality keys, this is usually fine since entries are removed once the request completes.

**Panic handling**: singleflight handles panics in the function - the panic is recovered and converted to an error that all callers receive.

## When to Use Request Coalescing

Request coalescing works best when:

- Multiple clients frequently request the same data simultaneously
- The underlying operation is expensive (database queries, external APIs)
- Data can be shared between requests (no per-user customization)
- You're already seeing duplicate queries in your logs or metrics

It's less useful when:

- Each request needs unique data
- Operations are already fast (sub-millisecond)
- Requests are evenly distributed and rarely concurrent

## Measuring the Impact

Add metrics to understand how much coalescing helps:

```go
type InstrumentedService struct {
    group        singleflight.Group
    totalCalls   int64
    coalescedCalls int64
}

func (s *InstrumentedService) GetData(key string) ([]byte, error) {
    atomic.AddInt64(&s.totalCalls, 1)

    result, err, shared := s.group.Do(key, func() (interface{}, error) {
        return s.fetchData(key)
    })

    if shared {
        atomic.AddInt64(&s.coalescedCalls, 1)
    }

    // Report metrics periodically
    // coalescedCalls / totalCalls shows the deduplication ratio

    if err != nil {
        return nil, err
    }
    return result.([]byte), nil
}
```

A high coalescing ratio means you're saving significant backend work.

## Summary

Request coalescing is a straightforward technique that can dramatically reduce API latency and backend load. Go's `singleflight` package makes it easy to implement correctly. Start by identifying endpoints with duplicate concurrent requests, add singleflight, and measure the improvement. Combined with caching, you can handle traffic spikes gracefully without scaling your database.

The key points to remember:

- Use `singleflight.Group.Do` for blocking calls with shared results
- Create separate groups or use prefixed keys for different resource types
- Combine with caching for both concurrent and sequential request optimization
- Use `DoChan` when you need timeouts
- Use `Forget` when implementing retries
