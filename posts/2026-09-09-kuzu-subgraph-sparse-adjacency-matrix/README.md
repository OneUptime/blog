# Convert a Kuzu Subgraph into a Sparse Adjacency Matrix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Python, Graph Database, Data Analysis, Database

Description: Export a selected Kuzu subgraph into a SciPy sparse matrix with stable node indices, isolated nodes, and explicit parallel-edge semantics.

A sparse adjacency matrix is useful when a graph calculation belongs in a numerical library. The conversion needs two contracts: which nodes belong to the subgraph, and what a matrix entry means. Without those decisions, isolated nodes can disappear and parallel relationships can silently change weights.

This example targets Kuzu 0.11.3 and SciPy's sparse array API. It creates a directed, weighted **induced subgraph**: include selected nodes and every matching relationship whose two endpoints are selected. Matrix entry `A[i, j]` is the total weight of relationships from node `i` to node `j`.

## Keep node identity beside the matrix

Matrix row numbers are local positions, not database IDs. Store an ordered list of business keys beside the matrix and build a key-to-position dictionary. Do not use a Kuzu internal node offset as a permanent matrix index: offsets are an engine identity detail and can be sparse or unsuitable for a portable export.

For several node tables, qualify each key with its table name or another globally unique identifier. Two tables can both contain a node whose primary key is one.

Install the example dependencies:

```bash
python -m pip install kuzu==0.11.3 numpy scipy
```

## Export nodes and edges from one transaction

The following code produces a three-by-three matrix, including an isolated node:

```python
import kuzu
import numpy as np
from scipy.sparse import coo_array


def rows(conn, query, parameters=None):
    result = conn.execute(query, parameters)
    try:
        output = []
        while result.has_next():
            output.append(result.get_next())
        return output
    finally:
        result.close()


def adjacency(conn, selected):
    selected = sorted(set(selected))
    if not selected:
        return [], coo_array((0, 0), dtype=np.float64).tocsr()
    params = {"ids": selected}
    conn.execute("BEGIN TRANSACTION READ ONLY").close()
    try:
        nodes = rows(conn, """
            MATCH (n:Vertex) WHERE n.id IN $ids
            RETURN n.id ORDER BY n.id
        """, params)
        edges = rows(conn, """
            MATCH (a:Vertex)-[e:Link]->(b:Vertex)
            WHERE a.id IN $ids AND b.id IN $ids
            RETURN a.id, b.id, e.weight
        """, params)
        conn.execute("COMMIT").close()
    except Exception:
        try:
            conn.execute("ROLLBACK").close()
        except RuntimeError:
            pass
        raise

    keys = [row[0] for row in nodes]
    if set(keys) != set(selected):
        raise ValueError("Selection contains unknown node IDs")
    index = {key: position for position, key in enumerate(keys)}
    row_indices, col_indices, weights = [], [], []
    for source, destination, weight in edges:
        if weight is None or not np.isfinite(weight):
            raise ValueError("Every edge needs a finite weight")
        row_indices.append(index[source])
        col_indices.append(index[destination])
        weights.append(weight)
    matrix = coo_array(
        (np.asarray(weights, dtype=np.float64),
         (np.asarray(row_indices, dtype=np.int64),
          np.asarray(col_indices, dtype=np.int64))),
        shape=(len(keys), len(keys)),
    ).tocsr()
    matrix.sum_duplicates()
    return keys, matrix


with kuzu.Database(":memory:", buffer_pool_size=64 * 1024 * 1024) as db:
    with kuzu.Connection(db) as conn:
        conn.execute("CREATE NODE TABLE Vertex(id INT64 PRIMARY KEY)").close()
        conn.execute(
            "CREATE REL TABLE Link(FROM Vertex TO Vertex, weight DOUBLE)"
        ).close()
        conn.execute(
            "UNWIND [10, 20, 30] AS id CREATE (:Vertex {id: id})"
        ).close()
        for weight in [2.0, 3.0]:
            conn.execute("""
                MATCH (a:Vertex {id: 10}), (b:Vertex {id: 20})
                CREATE (a)-[:Link {weight: $weight}]->(b)
            """, {"weight": weight}).close()
        keys, matrix = adjacency(conn, [10, 20, 30])
        assert keys == [10, 20, 30]
        assert matrix.shape == (3, 3)
        assert matrix[0, 1] == 5.0
        assert matrix[[2], :].nnz == 0
```

The separate node query preserves vertex 30 even though no edge mentions it. Reading both sets inside one read-only transaction avoids a mismatch caused by changes between the two queries. The helper owns that transaction and expects no existing manual transaction on the connection.

SciPy combines duplicate coordinates during conversion to CSR. Here that is deliberate: two edges of weights two and three produce weight five. The [COO reference](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.coo_array.html) describes duplicate-coordinate behavior.

## Choose different edge semantics explicitly

For binary connectivity, query distinct endpoint pairs and assign one to every coordinate. For relationship counts, give each edge weight one and let duplicate coordinates sum. For minimum-cost edges, aggregate `min(e.weight)` by endpoints in Cypher before constructing the matrix.

For an undirected interpretation, decide how reciprocal stored edges combine. Adding `A` and its transpose sums both directions and doubles diagonal entries. That might be correct for total interaction weight, but it is not automatically correct for an undirected graph with self-loops. Build the desired endpoint aggregation explicitly.

Zero weights also deserve attention. A stored zero can represent a real edge, while absent coordinates usually represent no edge. Calling `eliminate_zeros()` discards that distinction. Some numerical algorithms interpret zeros as missing edges even if the sparse object stores them, so consult the consuming algorithm's contract.

## Make exports reproducible

Persist the node-key list together with the matrix, relationship filter, direction convention, weight aggregation, engine version, and extraction time. A matrix without its key list cannot reliably map numerical results back to business entities.

For large selections, the example materializes nodes and edges in Python and uses memory proportional to the selected graph. Process batches or stream coordinate buffers if this is too large. Avoid converting a huge sparse matrix to a dense array merely to inspect it.

## Conclusion

Build an explicit node index, export the induced edge set consistently, and define how duplicate relationships become matrix values. Those choices make the sparse matrix a faithful graph representation rather than just a successful type conversion.

## Official Documentation

- [Python query results](https://kuzudb.github.io/docs/client-apis/python/)
- [Read-only transactions](https://kuzudb.github.io/docs/cypher/transaction/)
- [SciPy COO arrays](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.coo_array.html)
- [SciPy CSR arrays](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csr_array.html)
