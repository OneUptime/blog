# Validation Summary: Diagnose Slow Kuzu Queries with `EXPLAIN` and `PROFILE`

## Status

validated

## Post Type

Technical performance-troubleshooting guide

## Technologies Covered

- Kuzu 0.11.3
- Kuzu's Cypher implementation
- `EXPLAIN` and `PROFILE` physical query plans
- Recursive relationships using `WALK`, `TRAIL`, `ACYCLIC`, and `SHORTEST` semantics
- Recursive relationship predicates and depth bounds
- Primary-key indexes, cardinality, semi-mask optimization, and join planning
- Join-order hints using `HINT`, `JOIN`, and `MULTI_JOIN`

## Sources Consulted

- Kuzu 0.11.3 release: https://github.com/kuzudb/kuzu/releases/tag/v0.11.3
- Archived Kuzu repository: https://github.com/kuzudb/kuzu
- Kuzu performance debugging with `EXPLAIN` and `PROFILE`: https://kuzudb.github.io/docs/developer-guide/performance-debugging/
- Kuzu Cypher syntax, reserved keywords, and identifier escaping: https://kuzudb.github.io/docs/cypher/syntax/
- Kuzu `MATCH` and recursive relationship documentation: https://kuzudb.github.io/docs/cypher/query-clauses/match/
- Kuzu configuration reference: https://kuzudb.github.io/docs/cypher/configuration/
- Kuzu differences from Neo4j, including path semantics and index support: https://kuzudb.github.io/docs/cypher/difference/
- Kuzu table and primary-key DDL: https://kuzudb.github.io/docs/cypher/data-definition/create-table/
- Kuzu join-order hint guide: https://kuzudb.github.io/docs/developer-guide/join-order-hint/
- Kuzu CLI reference: https://kuzudb.github.io/docs/client-apis/cli/
- Kuzu 0.11.3 Cypher grammar: https://github.com/kuzudb/kuzu/blob/v0.11.3/src/antlr4/Cypher.g4
- Kuzu 0.11.3 recursive-pattern binding and validation: https://github.com/kuzudb/kuzu/blob/v0.11.3/src/binder/bind/bind_graph_pattern.cpp
- Kuzu 0.11.3 equality-predicate rewrite from a cross product to a hash join: https://github.com/kuzudb/kuzu/blob/v0.11.3/src/optimizer/filter_push_down_optimizer.cpp#L75-L130
- Kuzu 0.11.3 profiler metric implementation: https://github.com/kuzudb/kuzu/blob/v0.11.3/src/processor/operator/physical_operator.cpp#L201-L239
- Kuzu 0.11.3 `db_version()` implementation: https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/db_version.cpp
- LadybugDB maintained performance-debugging guide: https://docs.ladybugdb.com/developer-guide/performance-debugging/

## Issues Found

1. **Reserved `Order` identifier was not escaped.**
   - What was wrong: Every query using `(o:Order)` failed to parse in Kuzu 0.11.3 because `ORDER` is a reserved Cypher keyword and keywords are case-insensitive.
   - What changed: Updated all five affected query examples to use the escaped label ``(o:`Order`)``.
   - Why: Kuzu requires reserved keywords used as identifiers to be enclosed in backticks.

2. **The recursive-depth fallback was described as a fixed configured value of 30.**
   - What was wrong: An omitted upper bound uses the connection's `VAR_LENGTH_EXTEND_MAX_DEPTH` setting. That setting defaults to 30, but a connection can change it.
   - What changed: Named the setting explicitly and clarified that 30 is its default.
   - Why: This preserves the safety warning without implying that every connection necessarily uses 30.

3. **The property-equality example was incorrectly described as executing a Cartesian product before filtering.**
   - What was wrong: For `WHERE p.country = i.origin_country`, Kuzu 0.11.3's filter-pushdown optimizer can rewrite the cross-product-shaped logical input into a hash join. An `EXPLAIN` smoke test showed `HASH_JOIN_PROBE` and `HASH_JOIN_BUILD`, not a physical Cartesian product.
   - What changed: Clarified that disconnected patterns without a join predicate form a Cartesian product, while the shown equality expression is a property join over two otherwise disconnected scans. The text now notes that both sides may still be scanned and repeated values may create many matches.
   - Why: The revised explanation matches both Kuzu's optimizer implementation and the actual 0.11.3 physical plan.

4. **`PROFILE` tuple counters were treated as directly comparable logical row counts.**
   - What was wrong: Kuzu uses vectorized, factorized execution, and `NumOutputTuples` is an operator-local metric whose counting behavior varies by operator. The official four-row profiling example itself displays adjacent counters of 4, 1, and 0, so mechanically looking for a jump between adjacent counters can misdiagnose the plan.
   - What changed: Recast the counters as operator-local work clues that must be corroborated with operator shape and final result cardinality, and updated the troubleshooting loop and conclusion consistently.
   - Why: This retains the useful profiling advice without presenting heterogeneous physical-operator counters as a uniform row pipeline.

## Review Notes

- All revised Cypher blocks were parser, binder, and runtime smoke-tested with the official Kuzu 0.11.3 macOS CLI using a representative schema and typed literal values in place of application parameters. `CALL db_version() RETURN *`, recursive predicate syntax, `SHORTEST`, the backward join-order hint, and `PROFILE` on a mutating statement were also tested directly.
- The post's `PROFILE` warning is correct: profiling runs the underlying statement, including writes. `EXPLAIN` does not execute the underlying statement.
- Operator execution times and tuple counters are diagnostic metrics and should not be expected to sum mechanically to wall-clock time or final result rows.
- The recursive predicate variables represent intermediate relationships and nodes, not the destination endpoint. The post already limits its claim to intermediate edges and nodes, so no correction was needed.
- `SHORTEST` selects one shortest path per reachable destination; `ALL SHORTEST` is required when every tied shortest path is needed. The post asks for nearest reachability rather than every tied path, so its example is correct.
- Kuzu eagerly executes and materializes the engine result before returning a `QueryResult`; not draining it primarily omits later client conversion, serialization, or rendering. The post's narrower claim about understating end-to-end work is therefore accurate.
- All seven links in the post's Official Documentation section resolved to the named official resources. Kuzu's repository is archived at version 0.11.3, and the post correctly treats newer LadybugDB behavior as lineage context rather than proof of Kuzu 0.11.3 behavior.
