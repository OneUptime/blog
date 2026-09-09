# Pass an External Node Selection into Kuzu with UNWIND

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Cypher, Python, Graph Database, Query Parameters

Description: Pass selected node IDs into Kuzu queries with UNWIND, explicit duplicate handling, stable ordering, and missing-node reporting.

An application often already knows which nodes a user selected. Sending those IDs as one list parameter lets Kuzu join the selection to graph data without constructing a large query string or opening a connection for every ID.

`UNWIND` turns a list into rows. That makes it useful when the selection itself needs deduplication, metadata, ordering, or missing-node reporting. This tutorial targets Kuzu 0.11.3 and uses the Python binding for parameter passing.

## Define selection behavior first

Decide whether `[3, 1, 3]` means a set of two nodes or a sequence of three selections. A graph filtering UI usually wants set behavior. A batch request might need one response per submitted item, including duplicates.

Also decide how to handle unknown IDs. A mandatory `MATCH` drops them. An `OPTIONAL MATCH` can preserve their input rows so the application can report which IDs were not found.

These choices affect query cardinality. They should be part of the endpoint contract rather than accidental consequences of the query planner.

## Bind a list and deduplicate it

This runnable example returns each selected person once:

```python
import kuzu


def selected_people(conn, selected):
    if not selected:
        return []
    if any(type(value) is not int for value in selected):
        raise TypeError("Person IDs must be integers")
    result = conn.execute("""
        UNWIND $ids AS selected_id
        WITH DISTINCT selected_id
        MATCH (person:Person)
        WHERE person.id = selected_id
        RETURN person.id AS id, person.name AS name
        ORDER BY id
    """, {"ids": selected})
    try:
        output = []
        while result.has_next():
            output.append(result.get_next())
        return output
    finally:
        result.close()


with kuzu.Database(":memory:", buffer_pool_size=64 * 1024 * 1024) as db:
    with kuzu.Connection(db) as conn:
        conn.execute(
            "CREATE NODE TABLE Person(id INT64 PRIMARY KEY, name STRING)"
        ).close()
        conn.execute("CREATE (:Person {id: 1, name: 'Ada'})").close()
        conn.execute("CREATE (:Person {id: 3, name: 'Cara'})").close()
        assert selected_people(conn, [3, 1, 3, 99]) == [
            [1, "Ada"], [3, "Cara"]
        ]
        assert selected_people(conn, []) == []
```

The empty-list shortcut gives the API an explicit empty result and avoids asking the binder to infer the element type of an empty parameter. The type check also excludes booleans, which Python otherwise treats as integer-like values. Add integer-range validation if inputs can exceed Kuzu's `INT64` range.

Values are passed as a parameter dictionary. Do not join external IDs into Cypher text. Apart from avoiding unsafe string construction, parameters keep query structure stable and make type mistakes easier to diagnose.

## Report unknown IDs

Use optional matching when the caller needs a result for each distinct requested ID:

```cypher
UNWIND $ids AS selected_id
WITH DISTINCT selected_id
OPTIONAL MATCH (person:Person)
WHERE person.id = selected_id
RETURN selected_id, person.name AS name,
       person.id IS NOT NULL AS found
ORDER BY selected_id;
```

For `[1, 99]`, this should return Ada with `found=true` and ID 99 with `found=false`. Test that case directly. A null name alone does not prove a missing node, because a real node may have a null name; checking the non-null primary key distinguishes the cases.

If missing IDs make the request invalid, check the returned `found` values before performing writes. A query that silently drops unknown nodes can make a bulk update look successful while touching only part of the selection.

## Preserve input sequence when needed

`UNWIND` does not provide an ordering guarantee for the final result. For an ordered batch, attach an explicit position to each item in Python:

```python
items = [{"position": i, "id": value}
         for i, value in enumerate([3, 1, 3])]
result = conn.execute("""
    UNWIND $items AS item
    OPTIONAL MATCH (person:Person)
    WHERE person.id = item.id
    RETURN item.position AS position, item.id AS requested_id,
           person.name AS name
    ORDER BY position
""", {"items": items})
```

This fragment assumes an existing `conn`. Consume and close `result` as in the earlier helper. Repeated IDs remain repeated because the position is part of the request identity. The first and third rows both refer to Cara, but they answer different submitted items.

## Choose IN for simpler membership filters

When you only need a set membership predicate, this is often clearer:

```cypher
MATCH (person:Person)
WHERE person.id IN $ids
RETURN person.id, person.name
ORDER BY person.id;
```

`UNWIND` becomes useful when the input rows themselves carry structure or require processing. Neither form guarantees better performance for every selection size. Inspect plans and measure representative small and large selections.

For very large batches, cap request sizes and split work deliberately. Define whether each batch needs a shared read snapshot, whether ordering spans all batches, and how partial failures are reported. For recurring large selections, a staging table or an imported selection dataset may be more manageable than a huge parameter payload.

## Verify cardinality and authorization

Test empty input, duplicate input, unknown IDs, mixed types, and selection order. For a multi-tenant application, include the tenant or ownership predicate in the graph match as well as the ID predicate. Possessing an ID in an external list does not establish permission to read its node.

## Conclusion

Use a list parameter and `UNWIND` when the selection needs row-level treatment. Make duplicate, missing-node, and ordering behavior explicit, then verify those cases against the same pinned Kuzu version as the application.

## Official Documentation

- [UNWIND](https://kuzudb.github.io/docs/cypher/query-clauses/unwind/)
- [Python parameter execution](https://kuzudb.github.io/docs/client-apis/python/)
- [OPTIONAL MATCH](https://kuzudb.github.io/docs/cypher/query-clauses/optional-match/)
- [ORDER BY](https://kuzudb.github.io/docs/cypher/query-clauses/order-by/)
