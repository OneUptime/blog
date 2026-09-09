# Represent Multiple Classification Labels on a Kuzu Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Cypher, Data Modeling, Graph Database, List

Description: Store simple Kuzu classifications in STRING[] properties, normalize updates, and distinguish list values from schema labels.

A node can carry several application classifications without belonging to several node tables. For example, a document might be both `finance` and `internal`. In Kuzu, a `STRING[]` property is a straightforward representation when those classifications are simple values rather than independently managed entities.

The list is application data. It does not change the node's table label, create indexes for each value, or establish relationships to a taxonomy. This tutorial targets Kuzu 0.11.3 and keeps that distinction explicit.

## Declare the list property

```cypher
CREATE NODE TABLE Document(
    id STRING PRIMARY KEY,
    title STRING,
    classifications STRING[]
);
CREATE (:Document {
    id: 'doc-1',
    title: 'Quarterly Forecast',
    classifications: ['finance', 'internal']
});
CREATE (:Document {
    id: 'doc-2',
    title: 'Public Roadmap',
    classifications: ['product', 'public']
});
CREATE (:Document {
    id: 'doc-3',
    title: 'Unclassified Draft',
    classifications: []
});
```

The node table remains `Document`. A pattern such as `(d:finance)` asks for a node table label and does not mean “a document whose list contains finance.” Use a property predicate for that meaning.

Choose whether an empty list means “known to have no classification” and null means “not classified yet.” If the application treats them identically, normalize them consistently at ingestion; if it distinguishes them, preserve that distinction in queries and exports.

## Query membership

Use a list membership function for a single classification:

```cypher
MATCH (document:Document)
WHERE list_contains(document.classifications, 'finance')
RETURN document.id, document.title;
```

To require both classifications:

```cypher
MATCH (document:Document)
WHERE list_contains(document.classifications, 'finance')
  AND list_contains(document.classifications, 'internal')
RETURN document.id, document.title;
```

A null list does not satisfy these predicates as a known match. If you want to treat null as empty explicitly, use a typed empty-list fallback in a query or normalize stored values before the query.

These predicates filter values inside one table. Do not assume they have the same access path or performance as matching a declared node label. For a large collection, inspect a representative query plan and compare the list representation with category nodes and relationships.

## Normalize at the application boundary

A list permits duplicates and preserves element order. If classifications are a set, define a canonical representation rather than relying on every caller to submit identical spelling and order.

The following Python helper is a complete normalization and update example for an existing connection:

```python
ALLOWED = {"finance", "internal", "product", "public"}


def normalize_classifications(values):
    if values is None:
        raise ValueError("Classifications must be a list")
    if not isinstance(values, list):
        raise TypeError("Expected a list of classification strings")
    if any(not isinstance(value, str) for value in values):
        raise TypeError("Every classification must be a string")
    normalized = sorted({value.strip().lower() for value in values})
    unknown = set(normalized) - ALLOWED
    if unknown:
        raise ValueError(f"Unknown classifications: {sorted(unknown)}")
    return normalized


def set_classifications(conn, document_id, values):
    labels = normalize_classifications(values)
    result = conn.execute("""
        MATCH (document:Document {id: $id})
        SET document.classifications = CAST($labels AS STRING[])
        RETURN document.id
    """, {"id": document_id, "labels": labels})
    try:
        if not result.has_next():
            raise KeyError(document_id)
        return result.get_next()[0]
    finally:
        result.close()
```

The explicit cast gives an empty parameter list a clear target type. The function returns a matched primary key so a nonexistent document does not appear to be a successful update.

The lowercase policy is a domain choice. Do not apply it to case-sensitive external identifiers. Likewise, strip whitespace only when whitespace is not part of an identifier's meaning. A controlled vocabulary should define these rules centrally.

## Count documents by classification

Expand each document's list into rows:

```cypher
MATCH (document:Document)
UNWIND document.classifications AS classification
RETURN classification, count(DISTINCT document.id) AS documents
ORDER BY documents DESC, classification;
```

`count(DISTINCT document.id)` counts documents even if older data contains duplicate values inside a list. A plain `count(*)` counts occurrences and can overstate the number of classified documents.

Documents with empty lists contribute no classification rows. Report unclassified documents separately if they are part of a dashboard denominator. Otherwise, adding counts across classifications can also exceed the document count because a document may belong to several categories by design.

## Know when a list is no longer enough

Promote classifications to nodes when they need descriptions, aliases, hierarchy, access rules, or relationships to other entities. A relationship can then carry classification-specific evidence, confidence, assignment time, or source information.

List replacement is a simple write, but read-modify-write updates need concurrency control. Two callers that both read the old list and then replace it can overwrite each other's changes. Use one write transaction for the read and update, or design a version check at the application boundary.

Finally, keep classification separate from authorization unless the application validates the classification source and enforces a clear access policy. An arbitrary caller-controlled tag should not become a grant of access merely because it has a familiar name.

## Conclusion

Use `STRING[]` for compact, simple classification values and query it with list predicates. Normalize set-like values, count distinct documents after expansion, and move to category nodes when classifications need their own identity or metadata.

## Official Documentation

- [LIST data types](https://kuzudb.github.io/docs/cypher/data-types/)
- [List functions](https://kuzudb.github.io/docs/cypher/expressions/list-functions/)
- [UNWIND](https://kuzudb.github.io/docs/cypher/query-clauses/unwind/)
- [Python parameters](https://kuzudb.github.io/docs/client-apis/python/)
