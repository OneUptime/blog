# Extract a Kuzu Schema Dictionary with Properties and Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Cypher, Python, Graph Database, Data Modeling

Description: Build a Kuzu schema dictionary from catalog queries, preserving property types, primary keys, and every allowed relationship endpoint.

A graph schema export needs more than a list of node names. A query builder needs property types, an importer needs primary keys, and a relationship loader needs to know which node tables each relationship can connect. Kuzu exposes these through separate catalog queries. Combining their results produces a useful schema dictionary without sampling graph data.

This tutorial targets Kuzu 0.11.3. The upstream project is archived, so keep your binary and API version pinned when reproducing its behavior. The example uses the public catalog functions and avoids undocumented Python connection internals.

## Inspect the three catalog results

Run these against a database that contains `Person` and `Knows` tables:

```cypher
CALL show_tables() RETURN *;
CALL table_info('Person') RETURN *;
CALL show_connection('Knows') RETURN *;
```

The endpoint function is **`show_connection`**, singular, with a relationship table name. It is easy to confuse this with names in older discussions. The [0.11.3 implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/show_connection.cpp) is the authoritative reference for its arguments and returned columns.

`show_tables()` includes the table name, type, database name, and comment. `table_info()` returns property information, including the primary key flag for node tables. Relationship property metadata has different extra fields, so do not assume every result has a `primary key` column.

`show_connection()` can return multiple rows. Treat endpoints as a list, even if your current relationship table has only one source and destination pair. This preserves the schema when another allowed connection is added later.

## Build the dictionary

Install the pinned Python binding in an isolated environment:

```bash
python -m pip install kuzu==0.11.3
```

The following complete example creates an in-memory graph, reads its schema, and prints JSON:

```python
import json
import kuzu


def records(conn, query):
    result = conn.execute(query)
    try:
        names = result.get_column_names()
        rows = []
        while result.has_next():
            rows.append(dict(zip(names, result.get_next())))
        return rows
    finally:
        result.close()


def cypher_string(value):
    # Catalog functions require a literal in Kuzu 0.11.3.
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def schema_dictionary(conn):
    schema = {"nodes": {}, "relationships": {}}
    conn.execute("BEGIN TRANSACTION READ ONLY").close()
    try:
        for table in records(conn, "CALL show_tables() RETURN *"):
            if table["database name"] != "local(kuzu)":
                continue
            name = table["name"]
            literal = cypher_string(name)
            properties = records(
                conn, f"CALL table_info({literal}) RETURN *"
            )
            item = {"comment": table["comment"], "properties": properties}
            if table["type"] == "NODE":
                schema["nodes"][name] = item
            elif table["type"] == "REL":
                item["connections"] = records(
                    conn, f"CALL show_connection({literal}) RETURN *"
                )
                schema["relationships"][name] = item
        conn.execute("COMMIT").close()
        return schema
    except Exception:
        try:
            conn.execute("ROLLBACK").close()
        except RuntimeError:
            pass
        raise


with kuzu.Database(":memory:", buffer_pool_size=64 * 1024 * 1024) as db:
    with kuzu.Connection(db) as conn:
        conn.execute(
            "CREATE NODE TABLE Person(id INT64 PRIMARY KEY, name STRING)"
        ).close()
        conn.execute(
            "CREATE REL TABLE Knows(FROM Person TO Person, since INT64)"
        ).close()
        schema = schema_dictionary(conn)
        print(json.dumps(schema, indent=2, sort_keys=True))
        assert schema["nodes"]["Person"]["properties"][0]["primary key"]
        assert len(schema["relationships"]["Knows"]["connections"]) == 1
```

The string helper escapes a catalog name as a Cypher string literal. Ordinary query parameters are preferable for data values, but these catalog functions require literal arguments in this release. Do not replace the helper with raw interpolation, and do not treat a catalog string argument as a backtick-quoted identifier.

A read-only transaction keeps the several catalog reads in one transaction. The function should own that transaction: do not call it from a connection that already has a manual transaction open. If your application manages the surrounding transaction, move the begin, commit, and rollback statements to that layer.

## Keep metadata useful downstream

The dictionary intentionally retains the original column names instead of renaming every property field. That makes schema changes visible and simplifies checking the output against the CLI. An application-facing adapter can later normalize names such as `source table name` to `source_table`.

Store property types exactly as returned. Flattening `INT64[][]` into `LIST`, for example, loses information needed to bind nested values. Preserve default expressions as strings rather than evaluating them in Python. Keep catalog comments separate from application documentation: a blank comment does not mean a field has no business meaning.

For a schema cache, add the engine version, database identity, and your application's migration version to the exported document. Refresh after schema migrations. Comparing dictionaries after sorting property rows by `property id` makes changes easier to review, but property identifiers are catalog metadata, not permanent business identifiers.

The sample filters to the local Kuzu database. Attached databases have their own metadata and type mappings; include them deliberately under a separate namespace if your consumer needs them. Silently combining local and attached tables with the same name can overwrite entries.

## Verify the result

Check one node table with a list property, one relationship with properties, and a relationship table with several allowed endpoint pairs. An empty database should produce two empty dictionaries. Confirm that primary key names in relationship connections agree with the corresponding node metadata.

Do not infer schema from existing nodes. An empty table still has a schema, optional properties can be null in every sampled row, and a currently unused endpoint pair remains valid. Catalog inspection handles all three cases.

## Conclusion

Build the schema dictionary from `show_tables`, `table_info`, and `show_connection`. Preserve typed properties and every endpoint row, then add application documentation and cache versioning around that authoritative catalog data.

## Official Documentation

- [Kuzu catalog endpoint implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/show_connection.cpp)
- [Kuzu property metadata implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/table_info.cpp)
- [Python API](https://kuzudb.github.io/docs/client-apis/python/)
- [Transactions](https://kuzudb.github.io/docs/cypher/transaction/)
