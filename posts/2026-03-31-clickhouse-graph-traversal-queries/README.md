# How to Implement Graph Traversal Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Graph Traversal, Recursive Query, Analytics, Adjacency List

Description: Learn how to implement graph traversal queries in ClickHouse using recursive CTEs and self-joins to traverse hierarchical and network data.

---

ClickHouse is not a native graph database, but it supports graph-style traversal through recursive CTEs and self-joins. This is useful for organizational hierarchies, dependency graphs, and network topology.

## Representing a Graph

Store edges as a simple table:

```sql
CREATE TABLE edges (
    from_node UInt32,
    to_node UInt32,
    weight Float32 DEFAULT 1.0
) ENGINE = MergeTree() ORDER BY (from_node, to_node);
```

## Breadth-First Traversal with Recursive CTE

ClickHouse supports recursive CTEs (as of version 24.4+):

```sql
WITH RECURSIVE traversal AS (
    -- Base case: starting node
    SELECT to_node AS node, 1 AS depth, [1, to_node] AS path
    FROM edges
    WHERE from_node = 1

    UNION ALL

    -- Recursive case: one level deeper
    SELECT e.to_node, t.depth + 1, arrayConcat(t.path, [e.to_node])
    FROM edges e
    JOIN traversal t ON e.from_node = t.node
    WHERE t.depth < 5
      AND NOT has(t.path, e.to_node)  -- prevent cycles
)
SELECT node, depth, path
FROM traversal
ORDER BY depth, node;
```

## Finding All Reachable Nodes (Iterative with Arrays)

For simpler acyclic graphs, expand using `groupArrayDistinct` over multiple passes:

```sql
SELECT DISTINCT to_node AS reachable
FROM edges
WHERE from_node IN (
    SELECT to_node FROM edges WHERE from_node = 1
)
UNION DISTINCT
SELECT to_node FROM edges WHERE from_node = 1;
```

## Computing Node Degrees

```sql
SELECT
    from_node AS node,
    count() AS out_degree
FROM edges
GROUP BY node
ORDER BY out_degree DESC
LIMIT 10;
```

## Detecting Shortest Path Length

Using iterative depth expansion, find the minimum depth at which a target is reached:

```sql
WITH RECURSIVE paths AS (
    SELECT to_node AS node, 1 AS depth
    FROM edges WHERE from_node = {start:UInt32}
    UNION ALL
    SELECT e.to_node, p.depth + 1
    FROM edges e JOIN paths p ON e.from_node = p.node
    WHERE p.depth < 10
)
SELECT min(depth) AS shortest_path
FROM paths
WHERE node = {target:UInt32};
```

## Summary

ClickHouse handles graph traversal via recursive CTEs with cycle detection using path arrays. For simple hierarchy lookups without recursion support, multi-level self-joins work well. Limit recursion depth to avoid runaway queries on dense graphs.
