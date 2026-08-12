# How to Export and Validate a Kuzu Graph Before Moving to Another Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Graph Migration, Data Export, Validation, Parquet

Description: Build a verifiable Kuzu migration bundle with logical schema and data exports, baseline invariants, checksums, and a clean restore rehearsal.

---

A copied Kuzu database file is a backup candidate, not a portable migration contract. The durable handoff is a logical export plus evidence that the source and target represent the same graph. Kuzu's `EXPORT DATABASE` command creates that handoff: schema and macro Cypher, generated `COPY FROM` statements, and table data in Parquet by default or CSV when requested.

The export is only half the job. Before cutover, record invariants from the source, inspect and checksum the bundle, restore it into a disposable database, and replay application queries. That process catches missing extensions, wrong types, null conversion, relationship mapping, and partial imports while rollback is still easy.

## 1. Freeze the Source Definition

Record the exact Kuzu engine and client package that open the production database:

~~~bash
kuzu --version
python -c 'import kuzu; print(kuzu.__version__)'
~~~

Kuzu is archived and its final release is `0.11.3`. Keep the binary or container digest with the migration bundle so the source can be reopened during the rollback window.

Inventory the catalog and loaded extensions from a trusted connection:

~~~cypher
CALL SHOW_TABLES() RETURN *;
CALL SHOW_LOADED_EXTENSIONS() RETURN *;
~~~

Load every extension on which an index depends before exporting. Kuzu's migration documentation explicitly warns that `EXPORT DATABASE` exports only indexes whose dependent extensions are loaded. If the application uses full-text or vector indexes, exercise their queries and record their definitions and results separately too.

Quiesce schema changes throughout the rehearsal. For the final export, quiesce writes as well. A consistent export should come from a controlled source state, not from a graph changing while operators compare counts.

## 2. Record Source Invariants

The best checks express business meaning, not only storage totals. Start with a table-level manifest using explicit, reviewed queries:

~~~cypher
MATCH (u:User) RETURN count(*) AS users;
MATCH (p:Product) RETURN count(*) AS products;
MATCH ()-[r:PURCHASED]->() RETURN count(*) AS purchases;
MATCH ()-[r:FOLLOWS]->() RETURN count(*) AS follows;
~~~

Then capture uniqueness, null, range, and relationship invariants relevant to the schema:

~~~cypher
// The target should preserve one row for every source primary key.
MATCH (u:User)
WITH u.id AS id, count(*) AS occurrences
WHERE occurrences <> 1
RETURN id, occurrences;

// Required application value, even if the database property is nullable.
MATCH (p:Product)
WHERE p.sku IS NULL
RETURN count(*) AS products_missing_sku;

// Detect implausible values before blaming the target.
MATCH (o:Order)
RETURN min(o.created_at) AS first_order,
       max(o.created_at) AS last_order,
       sum(o.total_cents) AS total_cents;

// Relationship distribution used by the application.
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN count(DISTINCT u.id) AS buyers,
       count(DISTINCT p.id) AS purchased_products;
~~~

Save outputs in a machine-readable format. The Kuzu CLI supports JSON and CSV display modes, or a client can serialize result rows. Include queries in source control so the same definitions run on the target after syntax adaptation.

Also create a deterministic sample keyed by business IDs. Random samples are hard to reproduce:

~~~cypher
MATCH (u:User)-[r:PURCHASED]->(p:Product)
WHERE u.id IN ['user-001', 'user-042', 'user-900']
RETURN u.id, p.id, r.ordered_at, r.quantity
ORDER BY u.id, r.ordered_at, p.id;
~~~

Choose examples that cover nulls, Unicode, timestamps, nested types, large values, and multiple relationships between the same nodes.

## 3. Create a Logical Export

Finish or roll back open manual transactions, then checkpoint when no other transactions are active:

~~~cypher
CHECKPOINT;
EXPORT DATABASE '/srv/migration/graph-export';
~~~

Kuzu documents Parquet as the default data format because it reduces formatting problems and performs well. The output includes:

~~~text
graph-export/
  schema.cypher
  macro.cypher
  copy.cypher
  ... Parquet data files ...
~~~

For a target that cannot consume Parquet, request CSV deliberately:

~~~cypher
EXPORT DATABASE '/srv/migration/graph-export-csv'
  (format='csv', header=true);
~~~

CSV adds choices about delimiters, quote/escape characters, null spelling, line endings, and encodings. Prefer Parquet when both ends support it. Never convert formats without validating the conversion as another migration step.

Use a new empty output directory for each run. Mixing files from two exports produces an artifact that no single source state created.

## 4. Inspect and Seal the Bundle

Read `schema.cypher`, `macro.cypher`, and `copy.cypher`. Confirm that every expected node table, relationship table, property, default, multiplicity, macro, and index appears. For relationship imports, verify the generated data maps the source and destination node primary keys expected by the target.

Create an inventory and checksums after export completion:

~~~bash
find /srv/migration/graph-export -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  > /srv/migration/graph-export.sha256

sha256sum --check /srv/migration/graph-export.sha256
~~~

Store the checksum file beside, not inside, the directory being checksummed. Record file count and total bytes, protect the bundle from modification, and encrypt it in transit and at rest according to the graph's data classification.

Generated Cypher is executable code. Review it before running it in a target with credentials or network access.

## 5. Rehearse a Clean Kuzu Restore

Even if the final target is not Kuzu, first prove that Kuzu can consume its own bundle. Create a disposable empty database with the same pinned release:

~~~bash
kuzu /srv/migration/rehearsal.kuzu
~~~

~~~cypher
IMPORT DATABASE '/srv/migration/graph-export';
~~~

Kuzu requires `IMPORT DATABASE` to target an empty database. It also documents that a failed import has no automatic rollback. If it fails, preserve logs, delete only the disposable rehearsal database, correct the bundle or environment, and start again from empty.

Run the full invariant suite against the rehearsal. This separates a bad source export from target-specific translation. Verify extension-backed indexes explicitly; import can load dependent extensions, and extension availability is a separate operational dependency in archived Kuzu.

## 6. Translate for the Destination

For LadybugDB, the active successor whose repository says it was formerly Kuzu, test `IMPORT DATABASE` into a new empty Ladybug database, then validate package, Cypher, type, and extension changes. Do not rename the raw `.kuzu` file to `.lbdb`.

For a different graph database, treat the bundle as a specification and data source:

- translate `CREATE NODE TABLE` and `CREATE REL TABLE` into the target schema model;
- preserve Kuzu primary keys as explicit external identifiers;
- load nodes before relationships;
- map Kuzu types and nulls explicitly;
- decide how parallel relationships and direction are represented;
- recreate indexes after data loading;
- translate Cypher dialect features and application queries separately.

Do not substitute a target's internal node ID for a Kuzu business primary key. Internal IDs are implementation details and make relationship files or later reconciliations brittle.

## 7. Compare More Than Counts

Matching counts can hide swapped endpoints, truncated strings, shifted timestamps, collapsed parallel edges, or changed nulls. Compare:

- node count per table/label;
- relationship count per type and source/destination type pair;
- distinct primary-key count and duplicate set;
- null count per important property;
- min/max/sum and selected grouped distributions;
- deterministic records by primary key;
- representative one-hop and multi-hop query results;
- application authorization and recommendation queries;
- extension-backed search result quality where applicable.

For large graphs, calculate stable partitions based on the source primary key and compare aggregate signatures per partition. Keep the logic database-neutral and inspect any mismatch rather than accepting an overall percentage.

Ordering deserves care: only compare ordered rows when the query includes an explicit `ORDER BY`. Query planners may return equally valid unordered results in different sequences.

## 8. Run the Final Cutover as a Repeatable Job

The final procedure should be the rehearsal with different paths:

1. stop source writes and drain jobs;
2. record final invariants;
3. checkpoint and export to a new directory;
4. checksum and inspect the bundle;
5. create an empty target;
6. import nodes, relationships, macros, and indexes;
7. run automated invariants and application smoke tests;
8. switch traffic;
9. monitor errors, latency, and graph-specific outcomes;
10. retain the pinned source engine, read-only source data, and export for the rollback period.

Define rollback before cutover. If the new target accepts writes, returning to Kuzu requires a plan for those writes; raw database files cannot be merged.

## Official Documentation

- [Kuzu migration with `EXPORT DATABASE` and `IMPORT DATABASE`](https://kuzudb.github.io/docs/migrate/)
- [Kuzu export formats](https://kuzudb.github.io/docs/export/)
- [Kuzu `COPY TO` Parquet](https://kuzudb.github.io/docs/export/parquet/)
- [Kuzu CLI and output modes](https://kuzudb.github.io/docs/client-apis/cli/)
- [Kuzu catalog `CALL` functions](https://kuzudb.github.io/docs/cypher/query-clauses/call/)
- [Kuzu transactions and checkpoints](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu create-table schema rules](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu archived repository](https://github.com/kuzudb/kuzu)
- [Ladybug migration documentation](https://docs.ladybugdb.com/migrate/)

## Conclusion

Exporting a Kuzu graph is a controlled data migration, not a file-copy task. Capture source invariants, export schema and data logically, seal the bundle with checksums, prove a clean restore, and compare graph semantics on the destination. A migration is complete only when the target answers the same important questions and the rollback artifact has been tested.
