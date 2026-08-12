# Validation Summary: Choose a Kuzu Ingestion Path for Millions of Nodes and Edges

## Status

validated

## Post Type

Technical guide / data-ingestion reference

## Technologies Covered

- Kuzu 0.11.3
- Cypher data definition and mutation clauses
- `COPY FROM`, `LOAD FROM`, `CREATE`, and `MERGE`
- CSV and Apache Parquet import
- Kuzu Python API
- Graph ETL and bulk-ingestion workflows
- LadybugDB

## Sources Consulted

- [Kuzu GitHub repository and archive notice](https://github.com/kuzudb/kuzu)
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu import overview](https://kuzudb.github.io/docs/import/)
- [Kuzu CSV import](https://kuzudb.github.io/docs/import/csv/)
- [Kuzu Parquet import](https://kuzudb.github.io/docs/import/parquet/)
- [Kuzu `COPY FROM` a subquery](https://kuzudb.github.io/docs/import/copy-from-subquery/)
- [Kuzu table-definition documentation](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu `CREATE` clause](https://kuzudb.github.io/docs/cypher/data-manipulation-clauses/create/)
- [Kuzu `MERGE` clause](https://kuzudb.github.io/docs/cypher/data-manipulation-clauses/merge/)
- [Kuzu Python API](https://kuzudb.github.io/docs/client-apis/python/)
- [Kuzu transaction semantics](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu execution internals](https://kuzudb.github.io/docs/developer-guide/database-internal/execution/)
- [Kuzu v0.11.3 source and test suite](https://github.com/kuzudb/kuzu/tree/v0.11.3)
- [LadybugDB import overview](https://docs.ladybugdb.com/import/)
- [LadybugDB repository](https://github.com/LadybugDB/ladybug)
- [LadybugDB release history](https://github.com/LadybugDB/ladybug/releases)
- [LadybugDB's official Kuzu-successor announcement](https://blog.ladybugdb.com/post/ladybug-spreading-its-wings/)

## Issues Found

1. The post stated categorically that there would be no later Kuzu optimizer release. The repository is archived and read-only and v0.11.3 is its latest release, but an unconditional prediction is not independently verifiable. Changed the sentence to say that applications should not expect a later optimizer release while the repository remains archived.
2. The decision table described every `COPY FROM` path as a "parallel, column-oriented bulk pipeline." Kuzu uses columnar storage, but parallel source reading depends on the source; for example, `PARALLEL` is a CSV reader option. Changed the entry to "Bulk insertion pipeline; parallel source reads where supported."
3. The decision table described `CREATE` as "one Cypher mutation at a time." Kuzu's `CREATE` clause is set-oriented: it can create an arbitrary pattern for every tuple produced by preceding clauses. Changed the entry to "Per-input-tuple Cypher mutation; not bulk-optimized."
4. The relationship `MERGE` discussion did not state that Kuzu relationship tables lack user-defined primary keys and permit parallel edges by default. Added a clarification that the shown endpoint-pair `MERGE` prevents another edge after a match, but does not enforce endpoint-pair uniqueness or remove existing duplicate edges, and `ON MATCH SET` applies to every matching edge.

## Review Notes

- The schema, `COPY FROM` statements, CSV options, glob input, partial-column import, `LOAD FROM` transformation subquery, Python parameter binding, relationship `CREATE`, node and relationship `MERGE`, validation queries, and warning query were executed or syntax-checked with the official `kuzu==0.11.3` Python package. The examples worked as described.
- Duplicate-key `CREATE` and mutable-property `MERGE` behavior was verified against Kuzu 0.11.3: both fail with a primary-key uniqueness error in the scenarios described.
- `CALL show_warnings() RETURN *` is connection-scoped. It should be run on the same connection that performed the import, before that connection is closed; the number retained is also subject to the connection's `warning_limit`.
- All external links listed in the post returned HTTP 200 and led to the described official documentation or release pages during review.
- Kuzu is version-frozen and archived. LadybugDB is the actively maintained successor, so future-facing implementations should separately validate LadybugDB's current behavior rather than assuming permanent parity with Kuzu 0.11.3.
