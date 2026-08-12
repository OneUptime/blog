# Validation Summary: Why Doesn’t Neo4j Cypher Run Unchanged in Kuzu? Finding Dialect and Schema Assumptions

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Kuzu 0.11.3
- Neo4j and Cypher 25
- openCypher
- LadybugDB
- CSV, Parquet, JSON, and DataFrame import

## Sources Consulted
- [Kuzu archive notice](https://github.com/kuzudb/kuzu)
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu differences from Neo4j](https://kuzudb.github.io/docs/cypher/difference/)
- [Kuzu Cypher manual](https://kuzudb.github.io/docs/cypher/)
- [Kuzu table DDL](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu `MERGE`](https://kuzudb.github.io/docs/cypher/data-manipulation-clauses/merge/)
- [Kuzu `MATCH` and recursive relationship semantics](https://kuzudb.github.io/docs/cypher/query-clauses/match/)
- [Kuzu recursive relationship functions](https://kuzudb.github.io/docs/cypher/expressions/recursive-rel-functions/)
- [Kuzu casting functions](https://kuzudb.github.io/docs/cypher/expressions/casting/)
- [Kuzu timestamp functions](https://kuzudb.github.io/docs/cypher/expressions/timestamp-functions/)
- [Kuzu list functions](https://kuzudb.github.io/docs/cypher/expressions/list-functions/)
- [Kuzu node and relationship functions](https://kuzudb.github.io/docs/cypher/expressions/node-rel-functions/)
- [Kuzu import documentation](https://kuzudb.github.io/docs/import/)
- [Kuzu performance debugging](https://kuzudb.github.io/docs/developer-guide/performance-debugging/)
- [Neo4j constraint creation](https://neo4j.com/docs/cypher-manual/current/schema/constraints/create-constraints/)
- [Neo4j match modes and path modes](https://neo4j.com/docs/cypher-manual/current/patterns/reference/match-modes-and-path-modes/)
- [Neo4j unique-relationship paths](https://neo4j.com/docs/cypher-manual/current/patterns/unique-relationship-paths/)
- [Neo4j list functions](https://neo4j.com/docs/cypher-manual/current/functions/list/)
- [Neo4j scalar functions](https://neo4j.com/docs/cypher-manual/current/functions/scalar/)
- [LadybugDB Neo4j compatibility guide](https://docs.ladybugdb.com/cypher/difference/)

## Issues Found
- The Neo4j `IS UNIQUE` example was presented as mapping directly to a Kuzu primary key, but Neo4j permits constrained nodes without that property while a Kuzu primary key is non-null. Added an explicit instruction to reject or supply missing IDs before import.
- The Neo4j path statement was categorical even though current Cypher 25 can opt into repeated relationships. Clarified that relationship-unique behavior is the Neo4j default and that `REPEATABLE ELEMENTS` is available.
- The post said Kuzu `ACYCLIC` prevents all repeated nodes. In Kuzu 0.11.3 it checks intermediate nodes but excludes the recursive segment's source and destination. Clarified the scope and documented `is_acyclic(p)` for whole-path node uniqueness.
- The `TRAIL` guidance could be read as reproducing Neo4j uniqueness for any complex graph pattern. Scoped the statement to the single recursive segment shown; Neo4j's default relationship uniqueness applies across the matched graph pattern.
- The `labels(n)` and `elementId(n)` mappings omitted result-type changes. Documented that Kuzu `label(n)` returns one `STRING` and `id(n)` returns an `INTERNAL_ID`.
- The `timestamp()` mapping was incorrect: Neo4j returns an epoch-millisecond integer, while Kuzu `current_timestamp()` returns a `TIMESTAMP`. Replaced it with `to_epoch_ms(current_timestamp())` when preserving Neo4j's result contract.
- The `toInteger(x)` mapping omitted input-domain and error-behavior differences. Neo4j accepts booleans and returns `NULL` for an unparseable supported input; Kuzu cannot cast `BOOL` to `INT64` and raises on invalid numeric strings. Added a migration warning.
- The `head(xs)` mapping omitted empty-list behavior. Neo4j returns `NULL` for `head([])`, while Kuzu's `list_extract([], 1)` and equivalent indexing raise an out-of-range error. Added an explicit guard requirement and made the `tail(xs)` slice concrete.
- The aggregation example named `count(*)` as an employee count even though it counts matched relationship rows. Renamed the result to `work_relationships` and described the exact grouping keys.

## Review Notes
- Kuzu DDL, `CREATE`, `MERGE`, recursive `MATCH`, `UNWIND`, aggregation, cast, list, label, ID, timestamp, `EXPLAIN`, and `PROFILE` syntax was checked against the official Kuzu 0.11.3 runtime. The self-contained snippets passed with representative fixtures; file-import snippets were checked against the format documentation because the source files are not part of the post.
- The `COPY FROM` examples assume Parquet columns compatible with the declared table schemas. Relationship input must identify the `FROM` and `TO` endpoint primary keys as required by Kuzu's import format.
- Kuzu was archived on October 10, 2025, and v0.11.3 is the final archived release. LadybugDB is the actively developed continuation formerly known as Kuzu, but its current behavior should be validated separately.
- Kuzu's whole-pattern `MERGE` description is correct, although that rule is not itself a Neo4j difference: Neo4j also matches or creates the complete `MERGE` pattern.
