# How to Use Redis Data Types for Graph-Like Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Graph, Set, Sorted Set, Data Modeling

Description: Learn how to model graph relationships in Redis using sets and sorted sets, enabling BFS traversal, shortest path approximation, and neighbor lookups.

---

Redis does not have a native graph data type (RedisGraph was deprecated). However, you can model directed and undirected graphs using sets and sorted sets, enabling neighbor lookups, BFS traversal, and weighted shortest paths for moderate-sized graphs.

## Modeling Edges with Sets

For an unweighted undirected graph, store each node's neighbors in a set:

```bash
# Social network: user follows
SADD graph:node:alice bob charlie dave
SADD graph:node:bob alice eve
SADD graph:node:charlie alice frank

# Get Alice's neighbors
SMEMBERS graph:node:alice

# Check if Alice and Bob are connected
SISMEMBER graph:node:alice bob   # Returns 1
```

## Weighted Edges with Sorted Sets

For weighted graphs (e.g., road networks), store neighbors in a sorted set with weights as scores:

```bash
# City connections with distances (km)
ZADD road:paris 341 lyon 450 brussels 340 london

ZADD road:lyon 341 paris 160 geneva 410 marseille
```

```python
import redis

r = redis.Redis()

def add_weighted_edge(graph_prefix, node_a, node_b, weight):
    """Add a bidirectional weighted edge."""
    pipe = r.pipeline()
    pipe.zadd(f"{graph_prefix}:{node_a}", {node_b: weight})
    pipe.zadd(f"{graph_prefix}:{node_b}", {node_a: weight})
    pipe.execute()

def get_neighbors(graph_prefix, node, max_weight=None):
    """Get all neighbors, optionally filtered by max weight."""
    key = f"{graph_prefix}:{node}"
    if max_weight is not None:
        return r.zrangebyscore(key, 0, max_weight, withscores=True)
    return r.zrange(key, 0, -1, withscores=True)

add_weighted_edge("road", "paris", "lyon", 341)
add_weighted_edge("road", "paris", "brussels", 450)

neighbors = get_neighbors("road", "paris", max_weight=400)
for city, dist in neighbors:
    print(f"{city.decode()}: {dist} km")
```

## BFS Traversal in Python

```python
from collections import deque

def bfs(graph_prefix, start, target=None, max_depth=3):
    """Breadth-first search using Redis set adjacency lists."""
    visited = set()
    queue = deque([(start, 0)])
    result = []

    while queue:
        node, depth = queue.popleft()
        if node in visited or depth > max_depth:
            continue
        visited.add(node)
        result.append((node, depth))

        if node == target:
            break

        neighbors = r.smembers(f"{graph_prefix}:{node}")
        for neighbor in neighbors:
            n = neighbor.decode()
            if n not in visited:
                queue.append((n, depth + 1))

    return result

# Build a small graph
r.sadd("social:alice", "bob", "charlie")
r.sadd("social:bob", "alice", "dave")
r.sadd("social:charlie", "alice", "eve")
r.sadd("social:dave", "bob", "frank")

path = bfs("social", "alice", max_depth=2)
for node, depth in path:
    print(f"{'  ' * depth}{node} (depth {depth})")
```

## Finding Mutual Connections

The power of set intersection for second-degree connections:

```python
def mutual_friends(graph_prefix, user_a, user_b):
    """Find mutual friends using SINTER."""
    return r.sinter(
        f"{graph_prefix}:{user_a}",
        f"{graph_prefix}:{user_b}"
    )

def friends_of_friends(graph_prefix, user):
    """Get all 2nd-degree connections."""
    friends = r.smembers(f"{graph_prefix}:{user}")
    fof_keys = [f"{graph_prefix}:{f.decode()}" for f in friends]
    if not fof_keys:
        return set()
    second_degree = r.sunion(fof_keys)
    # Remove direct friends and self
    return second_degree - friends - {user.encode()}
```

## Degree Centrality

```python
def node_degree(graph_prefix, node):
    """Number of edges (degree centrality)."""
    return r.scard(f"{graph_prefix}:{node}")

def top_hubs(graph_prefix, nodes, top_n=5):
    """Find nodes with the most connections."""
    degrees = [(node, node_degree(graph_prefix, node)) for node in nodes]
    return sorted(degrees, key=lambda x: x[1], reverse=True)[:top_n]
```

## Limitations and When to Use a Real Graph DB

Redis graph modeling works well for:
- Social graphs up to a few million nodes
- Recommendation engines with neighbor lookups
- Access control hierarchies

For more complex needs, consider a dedicated graph database:
- Shortest path across large graphs (Dijkstra requires multiple round trips)
- Pattern matching queries (Cypher-style)
- Graphs with billions of edges

## Summary

Redis models graphs using sets (unweighted edges) and sorted sets (weighted edges), with each node's neighbors stored in a dedicated key. BFS traversal, mutual connection finding, and degree centrality are all achievable with standard Redis commands. For moderate-sized social or recommendation graphs, this approach is practical and fast without requiring additional modules.
