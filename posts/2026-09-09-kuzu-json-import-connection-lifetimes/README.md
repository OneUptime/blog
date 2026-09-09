# Diagnose Kuzu JSON Imports Across Connection Lifetimes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, JSON, Python, Data Import, Troubleshooting

Description: Separate Kuzu JSON parsing, duplicate imports, extension state, and object lifetime problems with a controlled repeated-connection fixture.

A JSON import that succeeds once and fails after reopening a connection does not establish a single root cause. The second attempt may be loading duplicate keys, opening a different in-memory database, using a changed file path, or running with different extension and resource settings.

Start with a fixture that changes one lifecycle variable at a time. This guide targets Kuzu 0.11.3, whose JSON extension is bundled. It uses explicit result closure and one database owner across several sequential connections.

## Capture the exact failure boundary

Record the Kuzu package version, operating system, database path, JSON input hash, extension state, and complete exception message. Distinguish three events: constructing the database, opening a connection, and executing the import. A failure before the import should not be labeled a JSON parser failure.

Also record whether the first query's result was fully consumed and closed. Native resources can outlive a Python variable's apparent use, so deterministic cleanup makes a reproduction much easier to compare.

Do not delete the production database to “clear the error.” Work on a temporary fixture or a recoverable copy after the writer is stopped appropriately.

## Run a controlled lifecycle fixture

The following script scans the same JSON file through three connections and copies it into a new table each time. Using a fresh target table deliberately removes duplicate primary keys as a confounding variable.

```python
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import kuzu


def literal(value):
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def collect(conn, query):
    result = conn.execute(query)
    try:
        rows = []
        while result.has_next():
            rows.append(result.get_next())
        return rows
    finally:
        result.close()


with TemporaryDirectory() as directory:
    folder = Path(directory)
    source = folder / "records.json"
    source.write_text(json.dumps([
        {"id": 1, "name": "Ada"},
        {"id": 2, "name": "Ben"},
    ]), encoding="utf-8")
    print("kuzu", kuzu.__version__)
    print("input_sha256", hashlib.sha256(source.read_bytes()).hexdigest())
    source_literal = literal(str(source.resolve()))
    database_path = str(folder / "graph.kuzu")
    with kuzu.Database(
        database_path,
        buffer_pool_size=256 * 1024 * 1024,
        max_num_threads=2,
    ) as db:
        for number in range(3):
            with kuzu.Connection(db) as conn:
                conn.execute("LOAD EXTENSION json").close()
                scanned = collect(conn, f"""
                    LOAD FROM {source_literal}
                    (file_format='json', format='array')
                    RETURN id, name ORDER BY id
                """)
                assert scanned == [[1, "Ada"], [2, "Ben"]]
                table = f"Batch{number}"
                conn.execute(
                    f"CREATE NODE TABLE {table}(id INT64 PRIMARY KEY, name STRING)"
                ).close()
                conn.execute(f"""
                    COPY {table} FROM {source_literal}
                    (file_format='json', format='array')
                """).close()
                assert collect(conn, f"MATCH (n:{table}) RETURN count(*)") == [[2]]
```

Table names are generated from a controlled integer, not external input. File paths are escaped as Cypher string literals. The JSON file is a top-level array, so `format='array'` makes that contract explicit. A newline-delimited file needs the corresponding documented format instead.

The 256 MiB buffer pool and two worker threads are fixture settings. They are not a production sizing rule. A small buffer pool combined with many default worker threads can fail even on a tiny JSON file because scan buffers also consume memory.

## Separate parsing from mutation

`LOAD FROM ... RETURN ...` scans data without inserting it into a node table. If repeated scans succeed but repeated copies fail, investigate the target schema, primary keys, and transaction state before blaming the reader.

Copying the same IDs into the same node table twice is not an idempotent operation. A duplicate-key error on the second import is expected unless your ingestion workflow explicitly uses an upsert or replacement policy. Reconnecting does not erase committed rows in an on-disk database or in a still-live in-memory database owner.

If scans themselves fail, compare the file hash, absolute path, input format, inferred columns, and resource settings. A relative path resolved from another working directory can read a different file or no file at all.

## Inspect extension and ownership state

```cypher
CALL show_loaded_extensions() RETURN *;
```

Kuzu 0.11.3 bundles JSON, and explicitly loading it documents the dependency. An older Kuzu package or a different build may require matching extension artifacts. Keep the engine and bindings aligned instead of installing an unrelated extension binary to make an error disappear.

A `Connection` depends on its `Database` owner. Do not close the database while connections or results remain in use. Do not reuse a connection object after closing it. Close all objects before reopening the same writable database path with a new owner.

To test database lifetime separately, finish the entire `with kuzu.Database(...)` block, then open a new database object at the same path and query a table that was committed. Keep the temporary directory alive until that second phase finishes. An in-memory path cannot be used to test persistence across database owners.

## Classify the observed result

If only duplicate copies fail, fix replay semantics. If only large or highly parallel scans fail, investigate memory and worker configuration. If only a reopened database fails, inspect object closure, file ownership, and extension initialization. If the small fixture still fails at the same step with stable inputs, retain it with version and platform details as a reproducible engine issue.

The upstream repository is archived, so do not promise that a new upstream fix will arrive. For an established application, pin the known behavior, maintain a tested workaround or fork, or evaluate migration separately. An error disappearing after a version change still needs a regression fixture before being called fixed.

## Conclusion

Isolate scans from copies, connection lifetime from database lifetime, and duplicate-key behavior from parser behavior. A small repeated-connection fixture with stable input and explicit cleanup gives the evidence needed to identify the actual failure.

## Official Documentation

- [JSON extension formats](https://kuzudb.github.io/docs/extensions/json/)
- [Python lifecycle API](https://kuzudb.github.io/docs/client-apis/python/)
- [Connections and concurrency](https://kuzudb.github.io/docs/concurrency/)
- [JSON scan implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/json/src/functions/table_functions/json_scan.cpp)
- [Kuzu archive and bundled extensions](https://github.com/kuzudb/kuzu)
