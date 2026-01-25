# How to Build a Distributed Cache with Consistent Hashing in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Distributed Systems, Caching, Consistent Hashing, Scalability

Description: Learn how to implement a distributed cache in Go using consistent hashing to evenly distribute data across nodes and minimize cache misses when scaling your cluster.

---

If you've ever worked with distributed systems, you've probably run into the problem of figuring out which server should store which piece of data. The naive approach of using `hash(key) % num_servers` works fine until you add or remove a server - then everything gets reshuffled and your cache hit rate tanks.

Consistent hashing solves this problem elegantly. In this post, we'll build a distributed cache from scratch in Go that uses consistent hashing to minimize data movement when nodes join or leave the cluster.

## Why Consistent Hashing?

Let's say you have 4 cache servers and you're using modulo hashing. When you add a 5th server, roughly 80% of your keys will map to different servers. That means 80% cache misses until things warm up again. For a high-traffic system, that's brutal.

With consistent hashing, adding a node only affects about `1/n` of your keys (where n is the number of nodes). Much better.

## The Core Concept

Imagine a ring of numbers from 0 to 2^32. Each server gets placed on this ring based on the hash of its identifier. When you need to store or retrieve a key, you hash the key and walk clockwise around the ring until you hit a server. That server owns the key.

The beauty is that when you add a server, it only takes over keys from its immediate neighbor - not from everyone.

## Implementing the Hash Ring

Let's start with the data structures:

```go
package cache

import (
    "hash/fnv"
    "sort"
    "sync"
)

// HashRing implements consistent hashing
type HashRing struct {
    nodes       map[uint32]string  // hash -> node identifier
    sortedKeys  []uint32           // sorted list of hashes for binary search
    replicas    int                // virtual nodes per physical node
    mu          sync.RWMutex
}

// NewHashRing creates a ring with the specified number of virtual nodes
func NewHashRing(replicas int) *HashRing {
    return &HashRing{
        nodes:      make(map[uint32]string),
        sortedKeys: []uint32{},
        replicas:   replicas,
    }
}
```

The `replicas` field is important. If you only place each server once on the ring, you might get uneven distribution. Virtual nodes (replicas) spread each physical server across multiple points on the ring, giving you much better balance.

Now let's implement adding and removing nodes:

```go
// hashKey generates a consistent hash for a given string
func (r *HashRing) hashKey(key string) uint32 {
    h := fnv.New32a()
    h.Write([]byte(key))
    return h.Sum32()
}

// AddNode adds a server to the ring with virtual nodes
func (r *HashRing) AddNode(node string) {
    r.mu.Lock()
    defer r.mu.Unlock()

    for i := 0; i < r.replicas; i++ {
        // Create unique key for each virtual node
        virtualKey := fmt.Sprintf("%s-%d", node, i)
        hash := r.hashKey(virtualKey)
        r.nodes[hash] = node
        r.sortedKeys = append(r.sortedKeys, hash)
    }

    sort.Slice(r.sortedKeys, func(i, j int) bool {
        return r.sortedKeys[i] < r.sortedKeys[j]
    })
}

// RemoveNode removes a server and all its virtual nodes
func (r *HashRing) RemoveNode(node string) {
    r.mu.Lock()
    defer r.mu.Unlock()

    for i := 0; i < r.replicas; i++ {
        virtualKey := fmt.Sprintf("%s-%d", node, i)
        hash := r.hashKey(virtualKey)
        delete(r.nodes, hash)
    }

    // Rebuild sorted keys without the removed node
    r.sortedKeys = r.sortedKeys[:0]
    for hash := range r.nodes {
        r.sortedKeys = append(r.sortedKeys, hash)
    }
    sort.Slice(r.sortedKeys, func(i, j int) bool {
        return r.sortedKeys[i] < r.sortedKeys[j]
    })
}
```

The key lookup uses binary search to find the first node clockwise from the key's hash:

```go
// GetNode returns the node responsible for the given key
func (r *HashRing) GetNode(key string) string {
    r.mu.RLock()
    defer r.mu.RUnlock()

    if len(r.sortedKeys) == 0 {
        return ""
    }

    hash := r.hashKey(key)

    // Binary search for the first node with hash >= key hash
    idx := sort.Search(len(r.sortedKeys), func(i int) bool {
        return r.sortedKeys[i] >= hash
    })

    // Wrap around to the first node if we've gone past the end
    if idx >= len(r.sortedKeys) {
        idx = 0
    }

    return r.nodes[r.sortedKeys[idx]]
}
```

## Building the Distributed Cache

Now let's wrap this in an actual cache implementation:

```go
package cache

import (
    "fmt"
    "sync"
    "time"
)

// CacheNode represents a single cache server
type CacheNode struct {
    data    map[string]cacheEntry
    mu      sync.RWMutex
}

type cacheEntry struct {
    value     interface{}
    expiresAt time.Time
}

// DistributedCache coordinates multiple cache nodes
type DistributedCache struct {
    ring   *HashRing
    nodes  map[string]*CacheNode
    mu     sync.RWMutex
}

// NewDistributedCache creates a cache cluster
func NewDistributedCache(replicas int) *DistributedCache {
    return &DistributedCache{
        ring:  NewHashRing(replicas),
        nodes: make(map[string]*CacheNode),
    }
}

// AddNode adds a new cache server to the cluster
func (dc *DistributedCache) AddNode(nodeID string) {
    dc.mu.Lock()
    defer dc.mu.Unlock()

    dc.nodes[nodeID] = &CacheNode{
        data: make(map[string]cacheEntry),
    }
    dc.ring.AddNode(nodeID)
}

// Set stores a value with optional TTL
func (dc *DistributedCache) Set(key string, value interface{}, ttl time.Duration) error {
    nodeID := dc.ring.GetNode(key)
    if nodeID == "" {
        return fmt.Errorf("no nodes available")
    }

    dc.mu.RLock()
    node, exists := dc.nodes[nodeID]
    dc.mu.RUnlock()

    if !exists {
        return fmt.Errorf("node %s not found", nodeID)
    }

    node.mu.Lock()
    defer node.mu.Unlock()

    entry := cacheEntry{value: value}
    if ttl > 0 {
        entry.expiresAt = time.Now().Add(ttl)
    }
    node.data[key] = entry

    return nil
}

// Get retrieves a value from the cache
func (dc *DistributedCache) Get(key string) (interface{}, bool) {
    nodeID := dc.ring.GetNode(key)
    if nodeID == "" {
        return nil, false
    }

    dc.mu.RLock()
    node, exists := dc.nodes[nodeID]
    dc.mu.RUnlock()

    if !exists {
        return nil, false
    }

    node.mu.RLock()
    defer node.mu.RUnlock()

    entry, found := node.data[key]
    if !found {
        return nil, false
    }

    // Check expiration
    if !entry.expiresAt.IsZero() && time.Now().After(entry.expiresAt) {
        return nil, false
    }

    return entry.value, true
}
```

## Putting It All Together

Here's how you'd use the distributed cache:

```go
func main() {
    // Create cache with 150 virtual nodes per physical node
    cache := NewDistributedCache(150)

    // Add some nodes (in reality, these would be different servers)
    cache.AddNode("server-1")
    cache.AddNode("server-2")
    cache.AddNode("server-3")

    // Store some data
    cache.Set("user:123", map[string]string{"name": "Alice"}, 5*time.Minute)
    cache.Set("session:abc", "token-xyz", 30*time.Minute)

    // Retrieve it
    if user, found := cache.Get("user:123"); found {
        fmt.Printf("Found user: %v\n", user)
    }

    // Adding a new node only affects ~1/4 of keys
    cache.AddNode("server-4")
}
```

## Best Practices

**Choose the right number of virtual nodes.** Too few and you get uneven distribution. Too many and you waste memory and slow down lookups. 100-200 virtual nodes per physical node is a good starting point for most use cases.

**Pick a good hash function.** FNV is fast and works well for most cases. If you need stronger distribution guarantees, consider xxHash or MurmurHash3. Avoid cryptographic hashes like SHA-256 unless you have a specific security requirement - they're overkill for this use case.

**Handle node failures gracefully.** In production, you'll want to detect failed nodes and remove them from the ring automatically. Consider using health checks and a consensus system like Raft for coordinating node membership.

**Think about replication.** Our simple implementation stores each key on exactly one node. For durability, you'd want to replicate to the next N nodes on the ring. This is how systems like Cassandra and DynamoDB work.

## Common Pitfalls

**Forgetting thread safety.** Cache operations will be called from multiple goroutines. Always protect shared state with mutexes or use lock-free data structures.

**Not handling the empty ring case.** If all nodes are down, `GetNode` returns empty string. Your code should handle this gracefully rather than panicking.

**Ignoring hot keys.** Consistent hashing distributes keys evenly, but it doesn't help if 50% of your traffic hits the same key. Consider request coalescing or local caching for hot keys.

**Rebalancing too aggressively.** When a node comes back after a brief outage, you don't want to immediately shuffle keys around. Add some hysteresis to prevent thrashing.

## What's Next?

This implementation gives you the foundation, but a production system needs more:

- Network communication between nodes (gRPC works great for this)
- Persistence for recovery after restarts
- Eviction policies when memory fills up (LRU, LFU, etc.)
- Monitoring and metrics for cache hit rates
- Client-side connection pooling

Consistent hashing is one of those fundamental distributed systems patterns that shows up everywhere - from databases to CDNs to load balancers. Understanding how it works under the hood makes you a better systems engineer, even if you end up using off-the-shelf solutions like Redis Cluster or Memcached in production.

The code in this post is intentionally simplified for clarity. For a production implementation, check out libraries like [groupcache](https://github.com/golang/groupcache) which handles many of the edge cases we glossed over.
