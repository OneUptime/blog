# Validation Summary: Preserve Sort Keys While Returning Distinct Nodes in Kuzu

## Status
validated

## Post Type
Technical guide with executable Cypher examples.

## Technologies Covered
- Kuzu 0.11.3
- Cypher projection, DISTINCT, grouping, aggregation, and sorting
- Graph node identity, relationship scores, null handling, and pagination

## Sources Consulted
- [Kuzu ORDER BY](https://kuzudb.github.io/docs/cypher/query-clauses/order-by/) — ordering expressions, tie-breaking, and restrictions on intermediate ordering.
- [Kuzu WITH](https://kuzudb.github.io/docs/cypher/query-clauses/with/) — projection, aggregation, and intermediate top-k queries.
- [Kuzu RETURN](https://kuzudb.github.io/docs/cypher/query-clauses/return/) — tuple distinctness, grouping by nodes, and null handling in aggregates.
- [Kuzu LIMIT](https://kuzudb.github.io/docs/cypher/query-clauses/limit/) — limiting ordered query results.
- [Kuzu CREATE TABLE](https://kuzudb.github.io/docs/cypher/data-definition/create-table/) — primary keys, property defaults, relationship definitions, and multiplicities.
- [Kuzu aggregate functions](https://kuzudb.github.io/docs/cypher/expressions/aggregate-functions/) — max semantics.
- [Kuzu transactions](https://kuzudb.github.io/docs/cypher/transaction/) — transaction boundaries and consistency.
- [Kuzu 0.11.3 projection binder source](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/binder/bind/bind_projection_clause.cpp) — explicit alias requirement for WITH expressions.
- [Kuzu releases](https://github.com/kuzudb/kuzu/releases) — version 0.11.3 availability and release details.
- [Official Kuzu repository](https://github.com/kuzudb/kuzu) — archived project status and continued usability of existing releases.

## Issues Found
- The inline counterexample used `WITH DISTINCT person, recommendation.score`, which fails on Kuzu 0.11.3 with `Binder exception: Expression in WITH must be aliased (use AS).` Changed it to `WITH DISTINCT person, recommendation.score AS score`. The version-tagged official binder source confirms this requirement. The corrected fragment still demonstrates the intended problem: distinct node-score pairs can produce multiple rows for one node.

## Review Notes
- Executed all five fenced Cypher blocks using the official Python package kuzu==0.11.3 in an isolated temporary environment with an in-memory database. Ran the fixture first, then each query. All passed, with Ben preceding Cara and scores 9 and 7 in the ranking query.
- Executed the corrected inline counterexample and confirmed three node-score pairs from the original fixture, including two for Ben.
- Additional passing checks covered parallel recommendations, tied scores resolved by ID, two nodes named Sam, null ages, mixed null/non-null scores, all-null scores, adding a lower score for Ben, adding a score of 10 for Cara, and LIMIT 10 with more than ten distinct candidates. Verified unique output IDs after ranking.
- The explicit missing-age flag places null ages last. In the tested 0.11.3 runtime, an all-null score group produces a null max and appears first under the unmodified `best_score DESC` ordering. The post does not promise a null-score placement policy; applications wanting unknown scores last should apply the same explicit missingness approach to best_score.
- Kuzu 0.11.3 is the latest official release listed, dated October 10, 2025. The official repository is archived. This does not invalidate the version-pinned queries, and none of the demonstrated syntax is deprecated for that release.
- The fixture assumes a fresh database. The early query examples require the Person and Recommends tables supplied by the later fixture.
- All four documentation URLs in the post resolve to the intended resources. Some web-tool fetches failed; direct HTTPS retrieval successfully supplied the ORDER BY, WITH, and LIMIT pages.
- Deterministic ordering does not preserve ranking across separately committed requests when data changes. The snapshot/materialized-result guidance is appropriate; concurrent pagination was reviewed conceptually against transaction documentation rather than load-tested.
- There are no terminal commands or configuration snippets in the post. README changes were limited to the invalid inline WITH expression.
