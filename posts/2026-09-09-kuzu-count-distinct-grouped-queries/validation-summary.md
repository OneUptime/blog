# Validation Summary: Rewrite COUNT DISTINCT Subqueries as Grouped Kuzu Queries

## Status

validated

## Post Type

Tutorial

## Technologies Covered

- Kuzu 0.11.3 graph database
- Cypher pattern matching and aggregation
- COUNT DISTINCT, WITH, RETURN, and OPTIONAL MATCH
- Query optimization and EXPLAIN/PROFILE

## Sources Consulted

- [Kuzu RETURN and grouping](https://kuzudb.github.io/docs/cypher/query-clauses/return/) — grouping keys, row distinctness, and null aggregation semantics.
- [Kuzu WITH](https://kuzudb.github.io/docs/cypher/query-clauses/with/) — intermediate projections and aggregation boundaries.
- [Kuzu OPTIONAL MATCH](https://kuzudb.github.io/docs/cypher/query-clauses/optional-match/) — left outer join behavior and unmatched null values.
- [Kuzu aggregate functions](https://kuzudb.github.io/docs/cypher/expressions/aggregate-functions/) — supported aggregate functions.
- [Kuzu data definition language](https://kuzudb.github.io/docs/cypher/data-definition/) — schema and table definitions.
- [Kuzu Cypher tutorial](https://kuzudb.github.io/docs/tutorials/cypher/) — DISTINCT and pattern matching.
- [Kuzu differences from Neo4j](https://kuzudb.github.io/docs/cypher/difference/) — schema requirements and subquery compatibility.
- [Kuzu performance debugging](https://kuzudb.github.io/docs/developer-guide/performance-debugging/) — EXPLAIN and PROFILE behavior.
- [Official Kuzu repository](https://github.com/kuzudb/kuzu) — release 0.11.3 and project archival notice.

## Issues Found

No technical issues found.

## Review Notes

- Executed all five fenced Cypher blocks using the official Python package kuzu==0.11.3 in an isolated temporary environment and an in-memory database. Executed the fixture statements in order. No README changes were necessary.
- Both the direct distinct-count query and the two-stage deduplication query returned `(1,1), (2,0), (3,0)` on the original fixture. The aggregate filter returned no rows. The independent-expansion query returned `(1,1,0), (2,0,1), (3,0,0)` for id, outgoing, and incoming.
- Verified that mandatory matching drops isolated people and that count(*) returns one for their optional rows. Adding Ada-to-Cara produced a distinct count of two; another Ada-to-Ben edge left that count unchanged.
- Extended the fixture with duplicate destination names, a null destination name, and a second source named Ada. Node counts retained separate identities and zero-count rows. Ada had four distinct destination nodes but only two distinct non-null names. Both grouped formulations agreed.
- Verified that a WHERE predicate attached to OPTIONAL MATCH, with no qualifying neighbors, preserves each person with a zero count. Filter placement remains significant when adapting other queries.
- EXPLAIN and PROFILE both executed successfully on the grouped query. No representative workload benchmark was performed; the post correctly avoids promising a speedup or a particular physical execution plan.
- The inline relationship.since projection is an illustrative fragment: using it requires a bound relationship variable and a relationship schema containing since. It is not a standalone query or a drop-in extension of the property-free fixture.
- All four official documentation links in the post resolved to the intended resources. WITH and OPTIONAL MATCH were retrieved directly after the browsing tool returned transient errors.
- The official repository was archived on October 10, 2025. The tutorial explicitly targets the available 0.11.3 release and remains technically useful for that version. Archival is a maintenance caveat, not evidence that the demonstrated queries are deprecated or incorrect.
- Kuzu documents EXISTS and COUNT subqueries but does not support CALL subqueries. The post appropriately avoids assuming complete Neo4j subquery compatibility. No original correlated query is supplied, so validation establishes the stated result semantics rather than equivalence to an unspecified original query.
