# How to Use VLINKS in Redis to View Vector Graph Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Set, HNSW, Graph Structure, Nearest Neighbor

Description: Learn how to use VLINKS in Redis to inspect the HNSW graph connections for a vector element, revealing its neighbors at each layer.

---

## What Is VLINKS?

`VLINKS` returns the HNSW (Hierarchical Navigable Small World) graph connections for a specific element in a Redis Vector Set. HNSW is the index structure used internally by Redis Vector Sets to enable fast approximate nearest-neighbor search.

Each element in the HNSW graph has connections (links) to other elements at multiple levels. VLINKS exposes these connections, which is useful for debugging search quality, understanding why certain results appear or don't appear in similarity searches, and analyzing the graph structure.

## Syntax

```text
VLINKS key element [WITHSCORES]
```

Returns a nested array: for each HNSW level, a list of connected element IDs.

## Basic Usage

```bash
# Build a small vector set
VADD graph_demo VALUES 4 0.1 0.2 0.3 0.4 a
VADD graph_demo VALUES 4 0.11 0.21 0.31 0.41 b
VADD graph_demo VALUES 4 0.12 0.22 0.32 0.42 c
VADD graph_demo VALUES 4 0.9 0.8 0.7 0.6 d
VADD graph_demo VALUES 4 0.91 0.81 0.71 0.61 e

# View HNSW connections for element 'a'
VLINKS graph_demo a
# Returns (levels listed from highest to level 0):
# 1) (empty array)    - higher level links (sparse, used for fast traversal)
# 2) 1) "b"           - level 0 links (base layer, dense connections)
#    2) "c"
#    3) "d"
```

## Understanding HNSW Levels

The HNSW graph is hierarchical:

- **Level 0 (base)**: All elements exist here with many connections to nearby vectors
- **Higher levels**: Fewer elements, fewer connections - used for fast initial traversal

```text
Level 2:  [entry_point]
           /         \
Level 1:  [a] ------- [d]
         / \          / \
Level 0: [a]-[b]-[c]-[d]-[e]  (all elements, dense connections)
```

When VSIM searches, it starts at the top level and descends, using connections at each level to navigate toward the query vector.

## Python Example: Analyzing Graph Connectivity

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_element_connections(key: str, element: str) -> dict:
    """Get HNSW connections for an element, organized by level."""
    raw = r.execute_command("VLINKS", key, element)
    if not raw:
        return {}

    connections = {}
    for level_idx, level_links in enumerate(raw):
        connections[f"level_{level_idx}"] = list(level_links) if level_links else []
    return connections

def analyze_neighborhood(key: str, element: str):
    """Print a connectivity report for an element."""
    connections = get_element_connections(key, element)
    print(f"\nHNSW connections for '{element}' in '{key}':")
    for level, neighbors in connections.items():
        print(f"  {level}: {neighbors if neighbors else '(none)'}")
    total = sum(len(v) for v in connections.values())
    print(f"  Total connections: {total}")

# Build a test vector set
elements = {
    "item:A": [0.1, 0.2, 0.3, 0.4],
    "item:B": [0.11, 0.21, 0.31, 0.41],
    "item:C": [0.12, 0.22, 0.32, 0.42],
    "item:D": [0.9, 0.8, 0.7, 0.6],
    "item:E": [0.91, 0.81, 0.71, 0.61],
}

for element_id, vec in elements.items():
    r.execute_command("VADD", "demo:vectors",
                      "VALUES", str(len(vec)), *[str(v) for v in vec], element_id)

analyze_neighborhood("demo:vectors", "item:A")
```

## Debugging Search Quality

Use VLINKS to understand why a specific element appears or doesn't appear in VSIM results:

```python
def explain_search_result(key: str, query_element: str, expected_result: str):
    """
    Check if expected_result is directly connected to query_element.
    A direct connection means it will likely appear in search results.
    """
    connections = get_element_connections(key, query_element)

    all_neighbors = set()
    for neighbors in connections.values():
        all_neighbors.update(neighbors)

    if expected_result in all_neighbors:
        print(f"'{expected_result}' is directly connected to '{query_element}' - will appear in search")
    else:
        print(f"'{expected_result}' is NOT directly connected - may not appear in small result sets")
        print(f"Direct neighbors of '{query_element}': {all_neighbors}")

explain_search_result("demo:vectors", "item:A", "item:B")
```

## Visualizing the Graph (Text-Based)

```python
def build_connection_graph(key: str) -> dict:
    """Build an adjacency representation of the HNSW graph."""
    # Get all elements - need VRANDMEMBER or track externally
    # For this example, use known elements
    elements = ["item:A", "item:B", "item:C", "item:D", "item:E"]

    graph = {}
    for elem in elements:
        connections = get_element_connections(key, elem)
        all_neighbors = []
        for neighbors in connections.values():
            all_neighbors.extend(neighbors)
        graph[elem] = list(set(all_neighbors))

    return graph

def print_graph(graph: dict):
    print("\nHNSW Graph Structure:")
    for node, neighbors in sorted(graph.items()):
        print(f"  {node} -> {', '.join(sorted(neighbors)) if neighbors else '(isolated)'}")

graph = build_connection_graph("demo:vectors")
print_graph(graph)
```

## What VLINKS Does Not Show

VLINKS shows the stored graph connections, but:
- Connections are asymmetric: A connected to B does not mean B is connected to A at the same level
- The graph evolves as more elements are added
- VSIM may find additional results via multi-hop traversal beyond direct connections

## Summary

`VLINKS` exposes the HNSW graph connections for a specific element in a Redis Vector Set, showing which elements it links to at each level of the hierarchy. This is primarily a diagnostic tool for debugging search quality, understanding why certain items appear in similarity results, and analyzing the internal graph structure. Use it alongside `VSIM` when investigating unexpected search results, and combine it with `VINFO` for a complete picture of your vector index.
