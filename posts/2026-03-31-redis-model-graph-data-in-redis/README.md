# How to Model Graph Data in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Graph Data, Data Modeling, Adjacency List, Social Network

Description: Learn how to model graph data structures in Redis using hashes, sets, and sorted sets to represent nodes, edges, and relationships efficiently.

---

## Why Model Graphs in Redis

Graph data models are useful for social networks, recommendation engines, dependency tracking, and access control trees. Redis does not have a native graph type, but you can effectively model graphs using its core data structures - hashes for node properties, sets for adjacency lists, and sorted sets for weighted edges.

## Core Data Structures for Graphs

### Nodes as Hashes

Store node properties in a hash keyed by node ID:

```bash
HSET node:user:1 name "Alice" age "30" city "NYC"
HSET node:user:2 name "Bob" age "25" city "LA"
HSET node:user:3 name "Carol" age "28" city "NYC"
```

### Edges as Sets

Use sets to store adjacency lists - which nodes a given node connects to:

```bash
# Alice follows Bob and Carol
SADD edges:follows:1 2 3

# Bob follows Alice
SADD edges:follows:2 1
```

### Weighted Edges as Sorted Sets

For graphs with edge weights (e.g., friendship strength or distance):

```bash
# Alice's connections with weights
ZADD weighted:edges:1 0.9 2
ZADD weighted:edges:1 0.5 3
```

## Querying the Graph

### Find All Neighbors

```bash
# Get all users Alice follows
SMEMBERS edges:follows:1
```

### Check if Edge Exists

```bash
SISMEMBER edges:follows:1 2
```

### Mutual Connections (Intersection)

```bash
# Find mutual follows between Alice (1) and Bob (2)
SINTER edges:follows:1 edges:follows:2
```

### Shortest Path (BFS in Application Code)

Redis does not compute shortest paths natively. Implement BFS in your application:

```python
import redis

r = redis.Redis()

def bfs(start, end):
    visited = set()
    queue = [[start]]
    while queue:
        path = queue.pop(0)
        node = path[-1]
        if node == end:
            return path
        if node in visited:
            continue
        visited.add(node)
        neighbors = r.smembers(f"edges:follows:{node}")
        for neighbor in neighbors:
            new_path = list(path)
            new_path.append(int(neighbor))
            queue.append(new_path)
    return None

path = bfs(1, 3)
print("Path:", path)
```

## Tracking Node Metadata

Store graph-level metadata for fast lookups:

```bash
# Track all node IDs
SADD graph:nodes 1 2 3

# Track all edge types
SADD graph:edge_types "follows" "likes" "blocked"
```

## Bidirectional Edges

For undirected graphs, maintain both directions:

```bash
# Add undirected edge between 1 and 2
SADD edges:friends:1 2
SADD edges:friends:2 1
```

And use a Lua script to atomically add both directions:

```lua
local nodeA = KEYS[1]
local nodeB = KEYS[2]
redis.call('SADD', 'edges:friends:' .. nodeA, nodeB)
redis.call('SADD', 'edges:friends:' .. nodeB, nodeA)
return 1
```

Load and call the script:

```bash
redis-cli EVAL "local nodeA = KEYS[1]; local nodeB = KEYS[2]; redis.call('SADD', 'edges:friends:' .. nodeA, nodeB); redis.call('SADD', 'edges:friends:' .. nodeB, nodeA); return 1" 2 1 2
```

## Degree Centrality

Count the number of edges per node (degree):

```bash
# Out-degree: how many nodes does Alice follow?
SCARD edges:follows:1

# In-degree requires a reverse index
SADD edges:followed_by:2 1
SADD edges:followed_by:3 1
SCARD edges:followed_by:2
```

## Practical Example - Social Follow Graph

```python
import redis

r = redis.Redis(decode_responses=True)

def follow(follower_id, followee_id):
    r.sadd(f"edges:follows:{follower_id}", followee_id)
    r.sadd(f"edges:followed_by:{followee_id}", follower_id)

def unfollow(follower_id, followee_id):
    r.srem(f"edges:follows:{follower_id}", followee_id)
    r.srem(f"edges:followed_by:{followee_id}", follower_id)

def get_followers(user_id):
    return r.smembers(f"edges:followed_by:{user_id}")

def get_following(user_id):
    return r.smembers(f"edges:follows:{user_id}")

def get_suggestions(user_id):
    # Friends of friends not already followed
    following = r.smembers(f"edges:follows:{user_id}")
    suggestions = set()
    for fid in following:
        fof = r.smembers(f"edges:follows:{fid}")
        suggestions.update(fof)
    suggestions.discard(str(user_id))
    suggestions -= following
    return suggestions

follow(1, 2)
follow(2, 3)
follow(3, 4)
print("Suggestions for user 1:", get_suggestions("1"))
```

## Memory Considerations

- Each set entry costs approximately 50-100 bytes overhead
- For dense graphs (millions of edges), consider using a dedicated graph database like FalkorDB or Neo4j
- Use EXPIRE on temporary subgraph results computed by your application

## Summary

Redis can model graph data effectively using hashes for node properties, sets for adjacency lists, and sorted sets for weighted edges. While Redis lacks native graph traversal algorithms, BFS and DFS can be implemented in application code. This approach works well for social graphs, recommendation systems, and access control trees where graph operations are relatively shallow.
