# How to Use Recursive Queries for Graph Traversal in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CTE, Graph

Description: Learn how to traverse graph structures in MySQL using recursive CTEs to find paths, connected components, and shortest routes in adjacency list tables.

---

Graphs appear frequently in databases: social networks, dependency trees, routing tables, and workflow systems all use graph-like structures. MySQL 8.0 recursive CTEs make it possible to traverse these structures directly in SQL without application-level looping.

## Graph Representation in MySQL

The most common storage pattern is an adjacency list, where each row stores an edge between two nodes:

```sql
CREATE TABLE edges (
  from_node INT NOT NULL,
  to_node   INT NOT NULL,
  weight    INT DEFAULT 1,
  PRIMARY KEY (from_node, to_node)
);

INSERT INTO edges VALUES
  (1, 2, 4), (1, 3, 2),
  (2, 4, 5), (3, 4, 1),
  (4, 5, 3);
```

## Traversing All Reachable Nodes

Use a recursive CTE to visit every node reachable from a starting node:

```sql
WITH RECURSIVE reachable AS (
  -- Anchor: starting node
  SELECT 1 AS node, 0 AS depth

  UNION ALL

  -- Recursive step: follow edges
  SELECT e.to_node, r.depth + 1
  FROM edges e
  JOIN reachable r ON e.from_node = r.node
  WHERE r.depth < 10  -- cycle guard
)
SELECT node, MIN(depth) AS min_depth
FROM reachable
GROUP BY node
ORDER BY min_depth;
```

The `depth < 10` guard prevents infinite loops in cyclic graphs.

## Finding All Paths Between Two Nodes

Track the path as a string to enumerate all routes:

```sql
WITH RECURSIVE paths AS (
  SELECT
    1 AS current,
    CAST('1' AS CHAR(200)) AS path,
    0 AS total_weight

  UNION ALL

  SELECT
    e.to_node,
    CONCAT(p.path, '->', e.to_node),
    p.total_weight + e.weight
  FROM edges e
  JOIN paths p ON e.from_node = p.current
  WHERE FIND_IN_SET(e.to_node, REPLACE(p.path, '->', ',')) = 0
)
SELECT path, total_weight
FROM paths
WHERE current = 5
ORDER BY total_weight;
```

`FIND_IN_SET` checks if a node already exists in the path string, preventing revisiting nodes in cycle detection.

## Shortest Path (BFS-style)

To find the shortest path by hop count, stop as soon as the destination is first reached:

```sql
WITH RECURSIVE bfs AS (
  SELECT 1 AS node, CAST('1' AS CHAR(200)) AS path, 0 AS hops

  UNION ALL

  SELECT e.to_node, CONCAT(b.path, '->', e.to_node), b.hops + 1
  FROM edges e
  JOIN bfs b ON e.from_node = b.node
  WHERE b.hops < 20
    AND FIND_IN_SET(e.to_node, REPLACE(b.path, '->', ',')) = 0
)
SELECT path, hops
FROM bfs
WHERE node = 5
ORDER BY hops
LIMIT 1;
```

## Ancestor and Descendant Lookup

For directed acyclic graphs (DAGs) like category hierarchies or package dependencies:

```sql
WITH RECURSIVE ancestors AS (
  SELECT from_node AS ancestor, to_node AS descendant, 1 AS level
  FROM edges
  WHERE to_node = 5

  UNION ALL

  SELECT e.from_node, a.descendant, a.level + 1
  FROM edges e
  JOIN ancestors a ON e.to_node = a.ancestor
)
SELECT ancestor, level
FROM ancestors
ORDER BY level;
```

## Performance Tips

Recursive graph queries can be expensive on large graphs. Index the adjacency table on both columns:

```sql
CREATE INDEX idx_edges_from ON edges(from_node);
CREATE INDEX idx_edges_to   ON edges(to_node);
```

Also set a reasonable `max_depth` guard and avoid unconstrained traversal on large, dense graphs.

## Summary

MySQL 8.0 recursive CTEs enable graph traversal directly in SQL using an anchor query to start at a node and a recursive term to follow edges. This pattern supports reachability checks, path enumeration, shortest path finding, and ancestor lookups on adjacency list tables.
