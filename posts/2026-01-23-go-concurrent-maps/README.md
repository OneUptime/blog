# How to Handle Concurrent Map Access in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Concurrency, Maps, sync.Map, Mutex, Race Conditions

Description: Learn how to safely access maps from multiple goroutines in Go using mutexes, sync.Map, and other concurrency patterns to avoid race conditions.

---

Go maps are not safe for concurrent access. Reading and writing from multiple goroutines without synchronization causes race conditions and can crash your program. This guide covers the solutions.

---

## The Problem

```go
package main

func main() {
    m := make(map[string]int)
    
    // Multiple goroutines accessing same map
    for i := 0; i < 100; i++ {
        go func(n int) {
            m["key"] = n  // RACE: concurrent write
        }(i)
    }
    
    // fatal error: concurrent map writes
}
```

Even reading while another goroutine writes is unsafe:

```go
go func() { m["key"] = 1 }()  // Write
go func() { _ = m["key"] }()  // Read - STILL UNSAFE
```

---

## Solution 1: sync.RWMutex

Use a read-write mutex for maps with many reads:

```go
package main

import (
    "fmt"
    "sync"
)

type SafeMap struct {
    mu sync.RWMutex
    m  map[string]int
}

func NewSafeMap() *SafeMap {
    return &SafeMap{
        m: make(map[string]int),
    }
}

func (sm *SafeMap) Get(key string) (int, bool) {
    sm.mu.RLock()         // Read lock - multiple readers allowed
    defer sm.mu.RUnlock()
    val, ok := sm.m[key]
    return val, ok
}

func (sm *SafeMap) Set(key string, value int) {
    sm.mu.Lock()          // Write lock - exclusive access
    defer sm.mu.Unlock()
    sm.m[key] = value
}

func (sm *SafeMap) Delete(key string) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    delete(sm.m, key)
}

func main() {
    sm := NewSafeMap()
    var wg sync.WaitGroup
    
    // Multiple writers
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            sm.Set(fmt.Sprintf("key%d", n), n)
        }(i)
    }
    
    // Multiple readers
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            sm.Get(fmt.Sprintf("key%d", n))
        }(i)
    }
    
    wg.Wait()
    fmt.Println("Done without race!")
}
```

---

## Solution 2: sync.Map

Go's standard library provides `sync.Map` for specific use cases:

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    var m sync.Map
    var wg sync.WaitGroup
    
    // Store values
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            m.Store(fmt.Sprintf("key%d", n), n)
        }(i)
    }
    
    wg.Wait()
    
    // Load values
    value, ok := m.Load("key50")
    if ok {
        fmt.Println("key50:", value)
    }
    
    // LoadOrStore - load existing or store new
    actual, loaded := m.LoadOrStore("key50", 999)
    fmt.Printf("key50 value: %v, was loaded (not stored): %v\n", actual, loaded)
    
    // Range over all entries
    m.Range(func(key, value interface{}) bool {
        fmt.Printf("%v: %v\n", key, value)
        return true  // Continue iteration
    })
    
    // Delete
    m.Delete("key50")
}
```

### When to Use sync.Map

Use `sync.Map` when:

1. **Keys are stable**: Written once, read many times
2. **Disjoint key sets**: Different goroutines access different keys
3. **Many reads, few writes**: Read-heavy workloads

Use `RWMutex` map when:

1. **Many updates to same keys**
2. **Need iteration over consistent snapshot**
3. **Type safety is important** (sync.Map uses interface{})

---

## Solution 3: Channel-Based Approach

For complex operations, use channels:

```go
package main

import (
    "fmt"
)

type MapOperation struct {
    Op    string // "get", "set", "delete"
    Key   string
    Value int
    Reply chan MapResult
}

type MapResult struct {
    Value int
    Found bool
}

type ConcurrentMap struct {
    data    map[string]int
    opChan  chan MapOperation
}

func NewConcurrentMap() *ConcurrentMap {
    cm := &ConcurrentMap{
        data:   make(map[string]int),
        opChan: make(chan MapOperation),
    }
    go cm.run()
    return cm
}

func (cm *ConcurrentMap) run() {
    for op := range cm.opChan {
        switch op.Op {
        case "get":
            val, ok := cm.data[op.Key]
            op.Reply <- MapResult{Value: val, Found: ok}
        case "set":
            cm.data[op.Key] = op.Value
            op.Reply <- MapResult{}
        case "delete":
            delete(cm.data, op.Key)
            op.Reply <- MapResult{}
        }
    }
}

func (cm *ConcurrentMap) Get(key string) (int, bool) {
    reply := make(chan MapResult)
    cm.opChan <- MapOperation{Op: "get", Key: key, Reply: reply}
    result := <-reply
    return result.Value, result.Found
}

func (cm *ConcurrentMap) Set(key string, value int) {
    reply := make(chan MapResult)
    cm.opChan <- MapOperation{Op: "set", Key: key, Value: value, Reply: reply}
    <-reply
}

func main() {
    m := NewConcurrentMap()
    
    m.Set("hello", 42)
    val, _ := m.Get("hello")
    fmt.Println("Value:", val)
}
```

---

## Solution 4: Sharded Map

For high-performance scenarios, shard the map:

```go
package main

import (
    "hash/fnv"
    "sync"
)

const shardCount = 32

type ShardedMap struct {
    shards [shardCount]*mapShard
}

type mapShard struct {
    mu    sync.RWMutex
    items map[string]interface{}
}

func NewShardedMap() *ShardedMap {
    sm := &ShardedMap{}
    for i := 0; i < shardCount; i++ {
        sm.shards[i] = &mapShard{
            items: make(map[string]interface{}),
        }
    }
    return sm
}

func (sm *ShardedMap) getShard(key string) *mapShard {
    h := fnv.New32()
    h.Write([]byte(key))
    return sm.shards[h.Sum32()%shardCount]
}

func (sm *ShardedMap) Get(key string) (interface{}, bool) {
    shard := sm.getShard(key)
    shard.mu.RLock()
    defer shard.mu.RUnlock()
    val, ok := shard.items[key]
    return val, ok
}

func (sm *ShardedMap) Set(key string, value interface{}) {
    shard := sm.getShard(key)
    shard.mu.Lock()
    defer shard.mu.Unlock()
    shard.items[key] = value
}

func (sm *ShardedMap) Delete(key string) {
    shard := sm.getShard(key)
    shard.mu.Lock()
    defer shard.mu.Unlock()
    delete(shard.items, key)
}
```

This reduces lock contention by spreading keys across multiple smaller maps.

---

## Detecting Race Conditions

Always test with the race detector:

```bash
go run -race main.go
go test -race ./...
```

Example race detection output:

```
==================
WARNING: DATA RACE
Write at 0x00c000090090 by goroutine 7:
  runtime.mapassign_faststr()
      /usr/local/go/src/runtime/map_faststr.go:202 +0x0
  main.main.func1()
      /path/to/main.go:10 +0x44

Previous write at 0x00c000090090 by goroutine 6:
  runtime.mapassign_faststr()
      /usr/local/go/src/runtime/map_faststr.go:202 +0x0
  main.main.func1()
      /path/to/main.go:10 +0x44
==================
```

---

## Generic Thread-Safe Map (Go 1.18+)

```go
package main

import (
    "fmt"
    "sync"
)

type SafeMap[K comparable, V any] struct {
    mu sync.RWMutex
    m  map[K]V
}

func NewSafeMap[K comparable, V any]() *SafeMap[K, V] {
    return &SafeMap[K, V]{
        m: make(map[K]V),
    }
}

func (sm *SafeMap[K, V]) Get(key K) (V, bool) {
    sm.mu.RLock()
    defer sm.mu.RUnlock()
    val, ok := sm.m[key]
    return val, ok
}

func (sm *SafeMap[K, V]) Set(key K, value V) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    sm.m[key] = value
}

func (sm *SafeMap[K, V]) Delete(key K) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    delete(sm.m, key)
}

func (sm *SafeMap[K, V]) Len() int {
    sm.mu.RLock()
    defer sm.mu.RUnlock()
    return len(sm.m)
}

func main() {
    // Type-safe concurrent map
    users := NewSafeMap[int, string]()
    
    users.Set(1, "Alice")
    users.Set(2, "Bob")
    
    name, _ := users.Get(1)
    fmt.Println("User 1:", name)
}
```

---

## Summary

| Solution | Best For | Pros | Cons |
|----------|----------|------|------|
| `sync.RWMutex` | General use | Simple, type-safe | Single lock contention |
| `sync.Map` | Read-heavy, disjoint keys | Built-in, optimized | interface{} types |
| Channels | Complex operations | Clean design | More code, overhead |
| Sharded map | High concurrency | Reduced contention | More complex |

**Best Practices:**

1. Always use `-race` flag during development
2. Prefer `sync.RWMutex` for most cases
3. Use `sync.Map` for stable-key scenarios
4. Consider sharding for very high concurrency
5. Document which maps need synchronization

---

*Building concurrent Go applications? [OneUptime](https://oneuptime.com) provides monitoring and tracing to help you detect and debug race conditions in production.*
