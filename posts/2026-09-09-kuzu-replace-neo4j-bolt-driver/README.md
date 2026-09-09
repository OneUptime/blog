# Replace Neo4j Bolt Calls with Embedded Kuzu Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Neo4j, Python, Graph Database, Migration

Description: Migrate Neo4j driver call sites to embedded Kuzu by replacing network sessions, adapting result handling, and preserving transaction semantics.

Kuzu is embedded in your application process. Replacing a Neo4j Bolt driver call therefore requires a different connection lifecycle, not merely a different connection URL. The application opens a Kuzu database path, creates a local connection, executes queries, and closes resources in dependency order.

This tutorial targets Kuzu 0.11.3. It demonstrates Python call-site changes and the behavioral checks needed around them. Kuzu is archived, so evaluate that lifecycle constraint separately before adopting it for a new long-lived system.

## Map the objects and responsibilities

| Neo4j driver concept | Embedded Kuzu counterpart |
| --- | --- |
| Driver configured with a server URI | `kuzu.Database` configured with a local path |
| Session or transaction context | `kuzu.Connection` plus explicit transaction statements |
| `session.run` result records | `QueryResult` column names and row values |
| Server-side database administration | Application-owned local database lifecycle and files |
| Bolt connectivity and authentication | Filesystem/process access and application authorization |

These are conceptual mappings, not drop-in API replacements. Neo4j's [connection documentation](https://neo4j.com/docs/python-manual/current/connect/) describes its network driver model, while Kuzu's Python API opens the embedded engine directly.

A Bolt URI such as `neo4j://host:7687` is not a Kuzu database location. Do not feed it to `kuzu.Database` and expect a remote connection.

## Replace a read call

A typical Neo4j read uses a driver and session that the application already configured:

```python
with driver.session(database="neo4j") as session:
    rows = session.run(
        "MATCH (p:Person) WHERE p.id = $id RETURN p.id AS id, p.name AS name",
        id=1,
    )
    people = [record.data() for record in rows]
```

The Kuzu equivalent uses a parameter dictionary and explicitly materializes the row shape:

```python
def find_person(conn, person_id):
    result = conn.execute("""
        MATCH (p:Person) WHERE p.id = $id
        RETURN p.id AS id, p.name AS name
    """, {"id": person_id})
    try:
        names = result.get_column_names()
        records = []
        while result.has_next():
            records.append(dict(zip(names, result.get_next())))
        return records
    finally:
        result.close()
```

Returning application-owned dictionaries keeps the rest of the application independent of the database client's record type. Explicit aliases prevent field names from changing when the query expression changes.

For large results, process rows as they arrive instead of collecting everything into a list. Keep the result and connection alive for the duration of processing, and close them on both success and failure.

## Create the schema explicitly

Kuzu uses declared node and relationship tables. A Neo4j workflow that first creates a node with an arbitrary label and properties must be adapted to that schema model.

The following complete fixture uses a temporary on-disk database and the helper above:

```python
from pathlib import Path
from tempfile import TemporaryDirectory
import kuzu

with TemporaryDirectory() as directory:
    path = str(Path(directory) / "graph.kuzu")
    with kuzu.Database(path, buffer_pool_size=64 * 1024 * 1024) as db:
        with kuzu.Connection(db) as conn:
            conn.execute(
                "CREATE NODE TABLE Person(id INT64 PRIMARY KEY, name STRING)"
            ).close()
            conn.execute(
                "CREATE (:Person {id: $id, name: $name})",
                {"id": 1, "name": "Ada"},
            ).close()
            assert find_person(conn, 1) == [{"id": 1, "name": "Ada"}]
```

For an application deployment, use a stable configured path and run schema migrations through a controlled startup or deployment step. Keep one database owner alive while its connections are in use. Close query results, then connections, then the database.

An in-memory database disappears when its owning database object closes. Opening a second database object with `:memory:` creates another independent database, not another session on the first one.

## Port transaction behavior deliberately

Neo4j managed transaction functions may retry their callbacks for retryable failures. Do not assume a plain Kuzu `execute` loop provides equivalent retry behavior. Consult the [Neo4j transaction documentation](https://neo4j.com/docs/python-manual/current/transactions/) when inventorying the behavior your application currently relies on.

In Kuzu, issue `BEGIN TRANSACTION`, execute all related work on the same connection, and finish with `COMMIT` or `ROLLBACK`. Check exceptions and preserve the original failure if rollback cleanup also fails. A retry should repeat the entire logical transaction after deciding that replay is safe.

Avoid remote service calls while holding a Kuzu write transaction. The documented single-writer model means a slow application operation can hold up unrelated writers. Use separate connections for independent work while respecting the database's concurrency constraints.

## Compare data and query semantics

Shared Cypher syntax does not guarantee equivalent results. Review labels, property types, null behavior, recursive paths, relationship multiplicity, and supported subquery forms using Kuzu's documented differences.

Do not carry Neo4j internal node or relationship identifiers over as business keys. Create stable application keys and map relationships using those keys during migration. A serialized Kuzu node dictionary also has different metadata fields from a Neo4j node object; prefer explicit property projections at the application boundary.

Test each migrated call against a representative fixture with duplicate display names, missing optional data, and parallel relationships. Compare sorted result records and write invariants, not just whether the query parsed.

## Reassign operational responsibilities

With an embedded database, backup scheduling, process shutdown, file permissions, disk capacity, and ownership of the writable database path become application deployment concerns. A separate server's authentication and network boundary no longer defines access to the graph.

If multiple services need remote graph access, design that service boundary explicitly. Embedding Kuzu separately in each service does not create a shared distributed graph or Bolt-compatible endpoint.

## Conclusion

Replace driver/session calls with a database owner, local connections, and explicit result adapters. Port schema, transaction, identity, and operational behavior alongside the query text so the application retains its intended semantics.

## Official Documentation

- [Kuzu Python API](https://kuzudb.github.io/docs/client-apis/python/)
- [Kuzu concurrency](https://kuzudb.github.io/docs/concurrency/)
- [Kuzu and Neo4j Cypher differences](https://kuzudb.github.io/docs/cypher/difference/)
- [Neo4j Python driver connection](https://neo4j.com/docs/python-manual/current/connect/)
- [Neo4j transaction handling](https://neo4j.com/docs/python-manual/current/transactions/)
