# Find Cycles After Bulk Loading a Kuzu Bill of Materials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Python, Graph Database, Data Import, Data Analysis

Description: Audit a bulk-loaded Kuzu bill of materials with strongly connected components, distinguishing cycle members from downstream blocked parts.

Bulk loading can introduce cycles even when an application's normal insert path rejects them. Before using a new bill-of-materials graph for planning or cost rollups, run a complete cycle audit on the imported graph.

A useful audit identifies strongly connected components. In a directed graph, every pair of nodes in such a component can reach each other. A component with more than one node contains a cycle; a single-node component is cyclic only when it has a self-loop.

This tutorial exports a consistent Kuzu 0.11.3 graph snapshot and computes strong components with SciPy. It reports the groups of parts involved in cycles without trying to enumerate every possible cycle.

## Define the audited graph

Assume `Part` nodes and `Contains` relationships directed from assembly to component:

```cypher
CREATE NODE TABLE Part(id STRING PRIMARY KEY);
CREATE REL TABLE Contains(FROM Part TO Part);
```

The audit should use exactly the relationship semantics used by your downstream BOM calculations. If your database stores several revisions or effective-date ranges, filter to one valid BOM version. Combining mutually exclusive historical edges can create an apparent cycle that never exists in a single valid version.

Conversely, filtering to a convenient root can miss cycles in disconnected parts of the import. A complete batch audit should include every part and containment edge in the intended publication scope.

## Export nodes and edges consistently

Install `kuzu==0.11.3`, NumPy, and SciPy in your Python environment, then define these helpers:

```python
from collections import defaultdict
import numpy as np
from scipy.sparse import coo_array
from scipy.sparse.csgraph import connected_components


def fetch(conn, query):
    result = conn.execute(query)
    try:
        rows = []
        while result.has_next():
            rows.append(result.get_next())
        return rows
    finally:
        result.close()


def cyclic_components(conn):
    conn.execute("BEGIN TRANSACTION READ ONLY").close()
    try:
        keys = [row[0] for row in fetch(
            conn, "MATCH (p:Part) RETURN p.id ORDER BY p.id")]
        edges = fetch(conn, """
            MATCH (parent:Part)-[:Contains]->(child:Part)
            RETURN parent.id, child.id
        """)
        conn.execute("COMMIT").close()
    except Exception:
        try:
            conn.execute("ROLLBACK").close()
        except RuntimeError:
            pass
        raise
    if not keys:
        return []
    index = {key: i for i, key in enumerate(keys)}
    row = np.asarray([index[a] for a, b in edges], dtype=np.int32)
    col = np.asarray([index[b] for a, b in edges], dtype=np.int32)
    graph = coo_array(
        (np.ones(len(edges), dtype=np.bool_), (row, col)),
        shape=(len(keys), len(keys)),
    ).tocsr()
    _, labels = connected_components(
        graph, directed=True, connection="strong", return_labels=True)
    groups = defaultdict(list)
    for key, label in zip(keys, labels):
        groups[int(label)].append(key)
    self_loops = {a for a, b in edges if a == b}
    return sorted(
        sorted(group) for group in groups.values()
        if len(group) > 1 or group[0] in self_loops
    )
```

The explicit `connection="strong"` is essential. SciPy defaults to weak connectivity, which ignores edge direction for component membership and does not identify cycles. See the [connected-components API](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.connected_components.html).

Reading node keys separately preserves isolated nodes. The read-only transaction keeps both exports consistent. The integer array indices are local matrix positions, while the returned component lists use stable part keys.

## Verify a cycle and a downstream part

```python
import kuzu

with kuzu.Database(":memory:", buffer_pool_size=64 * 1024 * 1024) as db:
    with kuzu.Connection(db) as conn:
        conn.execute("CREATE NODE TABLE Part(id STRING PRIMARY KEY)").close()
        conn.execute("CREATE REL TABLE Contains(FROM Part TO Part)").close()
        conn.execute("""
            UNWIND ['A', 'B', 'C', 'D', 'E'] AS id
            CREATE (:Part {id: id})
        """).close()
        for parent, child in [('A', 'B'), ('B', 'A'), ('B', 'C'), ('D', 'D')]:
            conn.execute("""
                MATCH (a:Part {id: $parent}), (b:Part {id: $child})
                CREATE (a)-[:Contains]->(b)
            """, {"parent": parent, "child": child}).close()
        assert cyclic_components(conn) == [['A', 'B'], ['D']]
```

Parts A and B form one cycle. D has a self-loop. C is downstream from the A/B cycle but is not itself a cycle member. E is isolated and acyclic.

That distinction matters during remediation. A topological-sort process can leave both cycle members and downstream blocked nodes unprocessed. Reporting every remaining node as a cycle member would incorrectly implicate C.

## Turn components into a repair report

For each cyclic component, include its part IDs, the source import batch, and the containment edges internal to that component. Keep original source row identifiers or BOM line IDs on relationships so a reviewer can trace the invalid edges back to the source file.

A component is not a list of all simple cycles. Dense components can contain very many cycles, and enumerating every one can be expensive. For a repair workflow, one cycle witness plus the internal edge set is often enough to identify the modeling mistake.

Do not automatically delete an arbitrary edge from each component. Several independent cycles can exist inside one component, and deleting the wrong edge may remove a valid assembly relationship while leaving another cycle intact. Repair the source-of-truth relationship, reload or update deliberately, and rerun the audit.

## Gate publication on the audited version

Run the audit on a staging database or a frozen import version, then publish that same validated graph. If another writer changes the graph after export, the completed audit only describes its earlier snapshot.

The Python export holds all selected keys and edges in memory. For very large BOMs, use an appropriately sized graph-analysis environment or a validated engine-side SCC implementation. Preserve complete coverage; a recursive query capped at a small number of hops cannot certify an arbitrary graph as acyclic.

Reconcile row counts before cycle analysis too. A graph with no cycles may still be incomplete because relationships with missing endpoints were dropped during ingestion.

## Conclusion

Audit the complete imported BOM with strong components and explicit self-loop checks. Report actual cycle members, retain source provenance, and publish only the graph version that passed the audit.

## Official Documentation

- [SciPy strong components](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.connected_components.html)
- [Kuzu Python API](https://kuzudb.github.io/docs/client-apis/python/)
- [Read transactions](https://kuzudb.github.io/docs/cypher/transaction/)
- [Topological-sort cycle behavior](https://docs.python.org/3/library/graphlib.html)
