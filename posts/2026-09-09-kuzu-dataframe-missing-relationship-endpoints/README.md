# Handle Missing Endpoints When Loading DataFrames into Kuzu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Python, Data Import, Graph Database, Troubleshooting

Description: Validate DataFrame relationship endpoints before Kuzu COPY, quarantine invalid rows, and reconcile accepted and rejected counts.

A relationship row cannot connect to a node that does not exist in its declared endpoint table. When importing a DataFrame into Kuzu, a missing endpoint can indicate a load-order problem, a type mismatch, an incomplete node extract, or a genuinely invalid reference.

The useful response is to identify which references are missing and decide how to handle them. Skipping every failing row can produce a graph that looks healthy while losing meaningful relationships. This tutorial uses Kuzu 0.11.3 and a small pandas fixture.

## Confirm schema and load order

Create and populate node tables before loading relationships. Inspect the allowed endpoint tables and their primary keys:

```cypher
CALL show_connection('Follows') RETURN *;
CALL table_info('Person') RETURN *;
```

If `Follows` connects `Person` to `Person`, both relationship endpoint columns must contain `Person` primary-key values. A relationship table's own property columns follow the endpoint columns in the input layout.

Check key types before comparing them. The string `"001"`, the string `"1"`, and the integer `1` may represent different business identifiers. Convert keys only according to an explicit source-system rule. Blind numeric conversion can erase leading zeros and merge distinct identities.

## Separate good and bad rows before COPY

The following complete example loads two nodes, quarantines an unknown source and a null source, and copies only the valid relationship:

```python
import kuzu
import pandas as pd

people = pd.DataFrame({"id": [1, 2], "name": ["Ada", "Ben"]})
links = pd.DataFrame({
    "source": pd.Series([1, 9, None], dtype="Int64"),
    "destination": pd.Series([2, 2, 1], dtype="Int64"),
    "weight": [1.0, 2.0, 3.0],
})

with kuzu.Database(":memory:", buffer_pool_size=64 * 1024 * 1024) as db:
    with kuzu.Connection(db) as conn:
        conn.execute(
            "CREATE NODE TABLE Person(id INT64 PRIMARY KEY, name STRING)"
        ).close()
        conn.execute(
            "CREATE REL TABLE Follows(FROM Person TO Person, weight DOUBLE)"
        ).close()
        conn.execute("COPY Person FROM $df", {"df": people}).close()

        conn.execute("BEGIN TRANSACTION").close()
        try:
            result = conn.execute("MATCH (p:Person) RETURN p.id")
            try:
                existing = set()
                while result.has_next():
                    existing.add(result.get_next()[0])
            finally:
                result.close()

            audited = links.copy()
            audited["missing_source"] = ~audited["source"].isin(existing)
            audited["missing_destination"] = ~audited["destination"].isin(existing)
            invalid = audited["missing_source"] | audited["missing_destination"]
            rejected = audited.loc[invalid].copy()
            accepted = audited.loc[~invalid, ["source", "destination", "weight"]].copy()
            accepted["source"] = accepted["source"].astype("int64")
            accepted["destination"] = accepted["destination"].astype("int64")
            assert len(accepted) + len(rejected) == len(links)
            if not accepted.empty:
                conn.execute(
                    "COPY Follows FROM $df (IGNORE_ERRORS=false)",
                    {"df": accepted},
                ).close()
            conn.execute("COMMIT").close()
        except Exception:
            try:
                conn.execute("ROLLBACK").close()
            except RuntimeError:
                pass
            raise

        assert len(accepted) == 1
        assert len(rejected) == 2
        result = conn.execute("MATCH ()-[r:Follows]->() RETURN count(*)")
        try:
            assert result.get_next()[0] == 1
        finally:
            result.close()
        print(rejected.to_dict("records"))
```

Passing the DataFrame as `$df` avoids relying on Python local-variable name discovery. The official [DataFrame import guide](https://kuzudb.github.io/docs/import/copy-from-dataframe/) documents parameter-based copying.

The write transaction spans endpoint inspection and relationship insertion, preventing another writer from deleting an endpoint between those steps. It intentionally starts after the node import in this demonstration. If the whole node-and-edge load must be atomic, place that import inside the same owned transaction too.

## Choose a missing-reference policy

For strict imports, abort if `rejected` is nonempty. For partial imports, save the rejected rows with their original source row IDs and the missing-endpoint flags. The example prints them for inspection, but a production pipeline should retain them in a durable quarantine artifact.

A third policy is to create placeholder nodes. Use it only when your model explicitly permits incomplete entities and marks them as such. Creating a real-looking node for a mistyped ID hides a source-data error and can contaminate downstream analysis.

If missing nodes are expected to arrive later, defer their relationships and retry after the node batch succeeds. Preserve a stable relationship identity or a deduplication rule so retrying does not create parallel copies of rows already accepted.

## Use IGNORE_ERRORS deliberately

Kuzu supports ignoring certain malformed import rows, but that is an ingestion policy, not a repair mechanism. Even after endpoint validation, other failures can remain: duplicate primary keys in node loads, invalid property types, or unexpected nulls.

The example makes `IGNORE_ERRORS=false` explicit for accepted rows. That keeps a second, unexpected failure visible. If you enable tolerant copying, inspect the documented warning facilities and reconcile the number actually loaded with the number submitted.

For a large graph, loading every existing key into a Python set may be too expensive. Stage the incoming endpoint keys, compare them against the graph in batches, and preserve the same accepted/rejected accounting. The example chooses clarity over an unmeasured large-scale ingestion strategy.

## Verify the final graph

Check the source count, accepted count, rejected count, and change in relationship count. Those values should agree with your parallel-edge and retry policy. Validate a few endpoint pairs and relationship properties, not only the aggregate count.

Keep schema creation errors separate from endpoint errors. If `show_connection` points to a different node table than expected, fix the schema or input mapping before changing missing-row handling.

## Conclusion

Load nodes first, validate endpoint keys with their actual types, and preserve rejected rows with a reason. Copy the accepted set under an explicit policy and reconcile counts so a partial graph never masquerades as a complete import.

## Official Documentation

- [DataFrame import](https://kuzudb.github.io/docs/import/copy-from-dataframe/)
- [Endpoint catalog function](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/show_connection.cpp)
- [Transactions](https://kuzudb.github.io/docs/cypher/transaction/)
- [Python API](https://kuzudb.github.io/docs/client-apis/python/)
