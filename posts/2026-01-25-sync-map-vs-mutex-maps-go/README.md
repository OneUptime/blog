# How to Choose Between sync.Map and Maps with Mutex in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Concurrency, sync.Map, Mutex, Performance

Description: A practical guide to choosing between sync.Map and regular maps protected by mutex in Go, with benchmarks and real-world use cases to help you pick the right tool for your concurrency needs.

---

Go gives you two main options for concurrent map access: the standard library's `sync.Map` or a regular `map` protected by `sync.Mutex` or `sync.RWMutex`. Both work. Both are safe. But they perform very differently depending on your access patterns. Picking the wrong one can leave performance on the table or, worse, introduce subtle bottlenecks that only show up under load.

This guide breaks down when to use each approach, backs it up with benchmarks, and gives you patterns you can drop into production code.

## The Core Trade-off

A mutex-protected map is simple: every read and write acquires a lock. This works well when reads and writes are balanced or when you have a small number of goroutines. The downside is contention. Under heavy concurrent access, goroutines spend more time waiting for locks than doing actual work.

`sync.Map` takes a different approach. It uses a combination of atomic operations and an internal read-only cache to optimize for two specific patterns: keys that are written once and read many times, and keys that are only ever accessed by one goroutine. The trade-off is that `sync.Map` has higher overhead for write-heavy workloads and doesn't support the full map API.

## When to Use sync.Map

The Go documentation is clear about when `sync.Map` shines:

1. When a key is written once but read many times (like a cache that's populated at startup)
2. When multiple goroutines read, write, and overwrite disjoint sets of keys

Here's a practical example - a configuration cache that's loaded once and read frequently:

```go
package config

import (
    "sync"
)

// ConfigCache stores configuration values that rarely change
type ConfigCache struct {
    store sync.Map
}

// Get retrieves a configuration value by key
func (c *ConfigCache) Get(key string) (string, bool) {
    // Load is lock-free for keys in the read-only portion
    value, ok := c.store.Load(key)
    if !ok {
        return "", false
    }
    return value.(string), true
}

// Set stores a configuration value
func (c *ConfigCache) Set(key, value string) {
    c.store.Store(key, value)
}

// LoadAll populates the cache from a source (called once at startup)
func (c *ConfigCache) LoadAll(configs map[string]string) {
    for k, v := range configs {
        c.store.Store(k, v)
    }
}
```

In this pattern, writes happen during initialization, and subsequent access is almost entirely reads. `sync.Map` handles this with minimal contention because reads hit an internal atomic snapshot.

## When to Use a Mutex-Protected Map

If your workload doesn't match the sync.Map sweet spots, a mutex-protected map is usually faster and more predictable. Use this approach when:

1. Writes are frequent relative to reads
2. You need operations like `len()`, iteration, or bulk updates
3. You want predictable, easy-to-reason-about locking semantics

Here's a session store that sees frequent writes and deletes:

```go
package session

import (
    "sync"
    "time"
)

type Session struct {
    UserID    string
    ExpiresAt time.Time
    Data      map[string]interface{}
}

// SessionStore manages active user sessions
type SessionStore struct {
    mu       sync.RWMutex
    sessions map[string]*Session
}

func NewSessionStore() *SessionStore {
    return &SessionStore{
        sessions: make(map[string]*Session),
    }
}

// Get retrieves a session (read lock allows concurrent readers)
func (s *SessionStore) Get(id string) (*Session, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    sess, ok := s.sessions[id]
    return sess, ok
}

// Set creates or updates a session
func (s *SessionStore) Set(id string, sess *Session) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.sessions[id] = sess
}

// Delete removes a session
func (s *SessionStore) Delete(id string) {
    s.mu.Lock()
    defer s.mu.Unlock()
    delete(s.sessions, id)
}

// CleanExpired removes all expired sessions (needs full lock)
func (s *SessionStore) CleanExpired() int {
    s.mu.Lock()
    defer s.mu.Unlock()

    now := time.Now()
    count := 0
    for id, sess := range s.sessions {
        if sess.ExpiresAt.Before(now) {
            delete(s.sessions, id)
            count++
        }
    }
    return count
}

// Count returns the number of active sessions
func (s *SessionStore) Count() int {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return len(s.sessions)
}
```

Notice how `sync.RWMutex` lets multiple readers proceed concurrently while still providing exclusive access for writes. The `CleanExpired` and `Count` methods would be awkward with `sync.Map` since it doesn't expose length or efficient iteration.

## Benchmark Comparison

Numbers matter. Here's a benchmark comparing both approaches under different read/write ratios:

```go
package main

import (
    "sync"
    "testing"
)

// Mutex-protected map
type MutexMap struct {
    mu sync.RWMutex
    m  map[string]int
}

func (m *MutexMap) Load(key string) (int, bool) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    v, ok := m.m[key]
    return v, ok
}

func (m *MutexMap) Store(key string, value int) {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.m[key] = value
}

// Benchmark: 95% reads, 5% writes (sync.Map wins)
func BenchmarkSyncMapReadHeavy(b *testing.B) {
    var m sync.Map
    m.Store("key", 1)

    b.RunParallel(func(pb *testing.PB) {
        i := 0
        for pb.Next() {
            if i%20 == 0 {
                m.Store("key", i)
            } else {
                m.Load("key")
            }
            i++
        }
    })
}

func BenchmarkMutexMapReadHeavy(b *testing.B) {
    m := &MutexMap{m: map[string]int{"key": 1}}

    b.RunParallel(func(pb *testing.PB) {
        i := 0
        for pb.Next() {
            if i%20 == 0 {
                m.Store("key", i)
            } else {
                m.Load("key")
            }
            i++
        }
    })
}

// Benchmark: 50% reads, 50% writes (mutex usually wins)
func BenchmarkSyncMapBalanced(b *testing.B) {
    var m sync.Map
    m.Store("key", 1)

    b.RunParallel(func(pb *testing.PB) {
        i := 0
        for pb.Next() {
            if i%2 == 0 {
                m.Store("key", i)
            } else {
                m.Load("key")
            }
            i++
        }
    })
}

func BenchmarkMutexMapBalanced(b *testing.B) {
    m := &MutexMap{m: map[string]int{"key": 1}}

    b.RunParallel(func(pb *testing.PB) {
        i := 0
        for pb.Next() {
            if i%2 == 0 {
                m.Store("key", i)
            } else {
                m.Load("key")
            }
            i++
        }
    })
}
```

Running these benchmarks typically shows:

- Read-heavy (95/5): `sync.Map` is 2-3x faster
- Balanced (50/50): `sync.RWMutex` is 1.5-2x faster
- Write-heavy (5/95): `sync.RWMutex` is significantly faster

The exact numbers vary by CPU and Go version, but the pattern holds. Test with your actual workload.

## The sync.Map API Limitations

Before reaching for `sync.Map`, know what you're giving up:

```go
var m sync.Map

// These work
m.Store("key", "value")
val, ok := m.Load("key")
m.Delete("key")
val, loaded := m.LoadOrStore("key", "default")
val, deleted := m.LoadAndDelete("key")

// These don't exist on sync.Map
// len(m)           - no length
// for k, v := range m  - no direct iteration
// m["key"]         - no index syntax

// Range exists but has caveats
m.Range(func(key, value interface{}) bool {
    // Called for each key/value pair
    // Return false to stop iteration
    // Note: not a consistent snapshot
    return true
})
```

If you need `len()`, consistent iteration, or type safety without casting, a mutex-protected map with generics (Go 1.18+) is often cleaner.

## Quick Decision Framework

Ask these questions about your use case:

1. **Is the map written once and read many times?** Use `sync.Map`.
2. **Do goroutines access mostly disjoint keys?** Use `sync.Map`.
3. **Do you need `len()`, iteration, or bulk operations?** Use mutex + map.
4. **Is your write ratio above 10-20%?** Use mutex + map.
5. **Is the access pattern unpredictable or changing?** Start with mutex + map. It's easier to reason about and optimize later.

When in doubt, benchmark your actual workload. The few minutes spent writing a benchmark will save hours of debugging performance issues in production.

## Final Thoughts

Both `sync.Map` and mutex-protected maps are tools with specific strengths. `sync.Map` is optimized for read-heavy, append-only patterns. Mutex-protected maps are more flexible, easier to understand, and often faster for general-purpose concurrent access.

The mistake is treating `sync.Map` as a drop-in replacement for mutex-protected maps. It isn't. Pick based on your access pattern, validate with benchmarks, and don't hesitate to switch if your workload changes. Concurrency primitives are cheap to swap - production outages aren't.
