# Reject Kuzu Bill-of-Materials Inserts That Create Cycles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Python, Graph Database, Data Modeling, ACID Transactions

Description: Check reachability and insert a bill-of-materials edge within one Kuzu write transaction, rejecting self-loops and cycle-closing edges.

A bill of materials is usually a directed acyclic graph. If an assembly contains a component, and that component already reaches the assembly through other containment edges, inserting the new edge creates a cycle.

For a proposed edge `parent -> child`, test whether **child already reaches parent**. The direction matters. Testing parent-to-child reachability only detects an existing descendant and does not answer whether the new edge closes a cycle.

This tutorial targets Kuzu 0.11.3. The example performs a complete in-memory reachability check inside the same write transaction as insertion. That avoids treating a finite recursive query depth as proof that no cycle exists.

## Declare the containment model

```cypher
CREATE NODE TABLE Part(id STRING PRIMARY KEY, name STRING);
CREATE REL TABLE Contains(FROM Part TO Part, quantity DOUBLE);
```

A table declaration constrains endpoint types but does not impose acyclicity. The application must enforce the graph rule on every write path, including imports and administrative scripts.

The implementation below assumes the existing graph is already acyclic. It prevents the proposed edge from introducing a new cycle; it does not repair an unrelated cycle left by an earlier import.

## Check and insert within one transaction

```python
from collections import defaultdict
import math


def query_rows(conn, query, params=None):
    result = conn.execute(query, params)
    try:
        rows = []
        while result.has_next():
            rows.append(result.get_next())
        return rows
    finally:
        result.close()


def add_component(conn, parent, child, quantity):
    if parent == child:
        raise ValueError("A part cannot contain itself")
    if not math.isfinite(quantity) or quantity <= 0:
        raise ValueError("Quantity must be positive and finite")

    conn.execute("BEGIN TRANSACTION").close()
    try:
        found = query_rows(conn, """
            MATCH (part:Part) WHERE part.id IN $ids
            RETURN part.id
        """, {"ids": [parent, child]})
        if {row[0] for row in found} != {parent, child}:
            raise ValueError("Both endpoint parts must exist")

        adjacency = defaultdict(set)
        for source, destination in query_rows(conn, """
            MATCH (a:Part)-[:Contains]->(b:Part)
            RETURN a.id, b.id
        """):
            adjacency[source].add(destination)
        if child in adjacency[parent]:
            raise ValueError("Containment edge already exists")

        pending = [child]
        visited = set()
        while pending:
            current = pending.pop()
            if current == parent:
                raise ValueError("Containment would create a cycle")
            if current in visited:
                continue
            visited.add(current)
            pending.extend(adjacency[current] - visited)

        created = query_rows(conn, """
            MATCH (a:Part {id: $parent}), (b:Part {id: $child})
            CREATE (a)-[:Contains {quantity: $quantity}]->(b)
            RETURN a.id, b.id
        """, {"parent": parent, "child": child, "quantity": float(quantity)})
        if len(created) != 1:
            raise RuntimeError("Expected exactly one new containment edge")
        conn.execute("COMMIT").close()
    except Exception:
        try:
            conn.execute("ROLLBACK").close()
        except RuntimeError:
            pass
        raise
```

Use this function with a connection that has no existing manual transaction. It owns the entire transaction boundary. Kuzu documents a single concurrent writer, so another write cannot slip between this check and insertion while this write transaction is active. See [transaction semantics](https://kuzudb.github.io/docs/cypher/transaction/).

A read-only check followed by a later write would not provide that guarantee. Another operation could change reachability between the two. Retrying after a write conflict must repeat the check and insertion together.

## Exercise the rule

With the helper defined, run this fixture:

```python
import kuzu

with kuzu.Database(":memory:", buffer_pool_size=64 * 1024 * 1024) as db:
    with kuzu.Connection(db) as conn:
        conn.execute(
            "CREATE NODE TABLE Part(id STRING PRIMARY KEY, name STRING)"
        ).close()
        conn.execute(
            "CREATE REL TABLE Contains(FROM Part TO Part, quantity DOUBLE)"
        ).close()
        conn.execute("""
            UNWIND ['A', 'B', 'C'] AS id CREATE (:Part {id: id})
        """).close()
        add_component(conn, 'A', 'B', 1)
        add_component(conn, 'B', 'C', 2)
        try:
            add_component(conn, 'C', 'A', 1)
        except ValueError as error:
            assert 'cycle' in str(error)
        else:
            raise AssertionError("Cycle-closing edge was accepted")
        rows = query_rows(conn, "MATCH ()-[r:Contains]->() RETURN count(*)")
        assert rows == [[2]]
```

The rejected insertion must leave exactly two edges. Checking only that an exception occurred would miss a bug that inserted the edge before detecting the cycle.

The helper also rejects parallel containment edges. That is an example business rule. If your BOM permits multiple line items for the same part pair, model the line identity and decide whether quantities aggregate. Parallel edges do not by themselves create a directed cycle, but they change counting and import semantics.

## Understand the cost and completeness tradeoff

The example reads the whole containment graph and uses memory proportional to its edge set. Reachability then visits each relevant vertex at most once, with a visited set preventing repeated work. It is suitable for modest graphs and as a correctness reference.

For a large BOM, fetch frontier neighbors in batches or maintain a validated topological ordering. Keep the same transaction boundary and prove the replacement check is complete. A query bounded to, for example, twenty hops can miss a longer return path. No returned path within that bound is not proof of acyclicity.

If the model has a strictly enforced maximum hierarchy depth, a bound derived from that invariant can be used. Enforce the depth rule on imports and updates too; documenting a preferred depth does not make it an invariant.

## Conclusion

Reject self-loops, check child-to-parent reachability completely, and insert only within the same owned write transaction. Validate bulk imports separately so every path that changes the BOM preserves the acyclic model.

## Official Documentation

- [Transactions and single writer](https://kuzudb.github.io/docs/cypher/transaction/)
- [Python API](https://kuzudb.github.io/docs/client-apis/python/)
- [MATCH patterns](https://kuzudb.github.io/docs/cypher/query-clauses/match/)
- [Connections and concurrency](https://kuzudb.github.io/docs/concurrency/)
