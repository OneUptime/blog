# How Redis Skiplist Implementation Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Skiplist, Sorted Set, Internal, Data Structure

Description: Understand how Redis implements skip lists for Sorted Sets, including the multi-level linked list structure that enables O(log N) rank queries and range operations.

---

## What Is a Skip List

A skip list is a probabilistic data structure that allows O(log N) search, insertion, and deletion by maintaining multiple layers of linked lists. Each higher level skips over more elements, similar to a balanced binary tree but without complex rebalancing.

Redis uses skip lists (combined with a hash table) as the backing store for Sorted Sets when they exceed the listpack encoding threshold.

## Skip List Structure

```text
Level 4: HEAD --------------------------------> [100] -> NULL
Level 3: HEAD --------> [20] ---------------> [100] -> NULL
Level 2: HEAD -> [10] -> [20] -> [50] -------> [100] -> NULL
Level 1: HEAD -> [10] -> [20] -> [30] -> [50] -> [100] -> NULL
```

Each node contains:
- A score (float64)
- A member string
- Forward pointers for each level
- A backward pointer (for reverse iteration)
- A span (number of nodes skipped at each level)

## How Redis Uses Skip Lists

Redis Sorted Sets use a combination of:
1. **Skip list** - for range queries (ZRANGE, ZRANGEBYSCORE) and rank operations (ZRANK)
2. **Hash table** - for O(1) score lookups by member name (ZSCORE, ZADD updates)

```bash
# Skip list operations that benefit from the ordered structure
ZRANGE scores 0 9 WITHSCORES      # O(log N + M) range query
ZRANGEBYSCORE scores 100 200      # O(log N + M) score range
ZRANK scores alice                # O(log N) rank lookup
ZCOUNT scores 0 100               # O(log N) count in range

# Hash table operations (O(1))
ZSCORE scores alice               # Direct score lookup
ZADD scores 150 alice             # Update score (uses hashtable to find, skiplist to reposition)
```

## Skip List Node in Redis Source

The Redis C implementation (simplified):

```c
// From redis/src/server.h
typedef struct zskiplistNode {
    sds ele;              // member string
    double score;         // sorting score
    struct zskiplistNode *backward;  // backward pointer
    struct zskiplistLevel {
        struct zskiplistNode *forward;  // forward pointer
        unsigned long span;             // nodes skipped
    } level[];            // variable-length array of levels
} zskiplistNode;

typedef struct zskiplist {
    struct zskiplistNode *header, *tail;
    unsigned long length;   // number of nodes
    int level;              // current max level in use
} zskiplist;
```

## Maximum Level and Probability

Redis skip lists have:
- Maximum level: 32 (can store 2^64 elements efficiently)
- Level promotion probability: 0.25 (each level has 25% chance of being promoted)

This means on average:
- 1/1 = 100% of nodes are at level 1
- 1/4 = 25% at level 2
- 1/16 = 6.25% at level 3
- And so on...

```javascript
// Simulating skip list level assignment (probability = 0.25)
function randomLevel(maxLevel = 32) {
  let level = 1;
  while (Math.random() < 0.25 && level < maxLevel) {
    level++;
  }
  return level;
}

// Average levels:
const levels = Array.from({ length: 1000 }, randomLevel);
const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
console.log(`Average level: ${avgLevel.toFixed(2)}`); // ~1.33
```

## Span Field for O(log N) Rank Queries

Each level's forward pointer tracks the `span` (nodes skipped). This allows ZRANK to compute rank in O(log N) by summing spans:

```text
Query: ZRANK scores "alice" (score=30)

Level 2: HEAD [span=3] -> [50] -> NULL
         (head to 50 skips 3 nodes at level 2)
Level 1: HEAD [span=1] -> [10] [span=1] -> [20] [span=1] -> [30="alice"]
         Traverse: span=1 + span=1 + span=1 = rank 2 (0-indexed)
```

## Observing Skip List Behavior

```bash
# Create a sorted set large enough to use skiplist encoding
redis-cli CONFIG SET zset-max-listpack-entries 10

for i in $(seq 1 20); do
  redis-cli ZADD leaderboard $((RANDOM % 1000)) "user:$i"
done

redis-cli OBJECT ENCODING leaderboard
# skiplist

# Range operations (O(log N + M))
redis-cli ZRANGE leaderboard 0 4 WITHSCORES REV  # Top 5
redis-cli ZRANGEBYSCORE leaderboard 500 1000       # Score range
redis-cli ZRANK leaderboard user:5                # O(log N) rank
redis-cli ZCOUNT leaderboard 0 500                # O(log N) count
```

## Skip List vs Alternative Data Structures

```text
Data Structure  | ZRANGE  | ZRANK   | ZADD    | Memory
----------------|---------|---------|---------|-------
Skip List       | O(log N)| O(log N)| O(log N)| Medium
AVL Tree        | O(log N)| O(log N)| O(log N)| High (pointers)
B-Tree          | O(log N)| O(N)    | O(log N)| High
Sorted Array    | O(N)    | O(log N)| O(N)    | Low
Hash Table      | O(N log N)| O(N)  | O(1)    | Low
```

Redis chose skip lists over balanced trees because:
- Simpler implementation
- Better cache performance (sequential memory access)
- Efficient range queries without tree rotation overhead
- Easy to implement lock-free variations

## Summary

Redis skip lists power Sorted Set range and rank queries with O(log N) complexity by maintaining a multi-level linked list where each higher level allows jumping over more nodes. The `span` field on each forward pointer enables exact rank calculation without full traversal. Redis pairs the skip list with a hash table to support O(1) score lookups, giving Sorted Sets the best of both data structures.
