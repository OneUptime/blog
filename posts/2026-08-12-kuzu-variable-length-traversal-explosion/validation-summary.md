# Validation Summary: Why Did a Variable-Length Kuzu Traversal Explode in Rows and Memory?

## Status
validated

## Post Type
Technical performance-troubleshooting guide

## Technologies Covered
- Kuzu 0.11.3 graph database
- Cypher variable-length and recursive relationship patterns
- `WALK`, `TRAIL`, `ACYCLIC`, `SHORTEST`, and `ALL SHORTEST` path semantics
- Recursive relationship filters and property projection
- Kuzu connection configuration, `EXPLAIN`, and `PROFILE`
- Graph traversal performance and memory management

## Sources Consulted
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Archived Kuzu repository and archive notice](https://github.com/kuzudb/kuzu)
- [Kuzu `MATCH` reference](https://kuzudb.github.io/docs/cypher/query-clauses/match/)
- [Kuzu recursive relationship functions](https://kuzudb.github.io/docs/cypher/expressions/recursive-rel-functions/)
- [Kuzu connection configuration](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu performance debugging with `EXPLAIN` and `PROFILE`](https://kuzudb.github.io/docs/developer-guide/performance-debugging/)
- [Kuzu differences from Neo4j path semantics](https://kuzudb.github.io/docs/cypher/difference/)
- [Kuzu node-table primary keys and indexes](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu v0.11.3 recursive-pattern grammar](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/antlr4/Cypher.g4)
- [Kuzu v0.11.3 recursive-bound binder and maximum-depth enforcement](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/binder/bind/bind_graph_pattern.cpp)
- [Kuzu v0.11.3 default connection configuration](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/main/client_config.h)
- [Kuzu v0.11.3 limit-pushdown implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/optimizer/limit_push_down_optimizer.cpp)
- [LadybugDB maintained `MATCH` reference](https://docs.ladybugdb.com/cypher/query-clauses/match/)
- [LadybugDB repository and Kuzu lineage](https://github.com/LadybugDB/ladybug)

## Issues Found
- **The branching example incorrectly called `10^depth` an upper bound derived from average degree.** An average out-degree does not bound the reachable branching factor, and overlap primarily makes walks converge on endpoints rather than necessarily reducing the number of edge sequences. Reframed the example as an explicit ten-choices-per-step illustration and clarified the effects of varying degree, labels, directions, convergence, hubs, and cycles.
- **The `ACYCLIC` explanation included the endpoints in its no-repeat guarantee.** In Kuzu 0.11.3, `ACYCLIC` checks the intermediate nodes represented by the recursive relationship, not the source and destination nodes. Updated the semantic definition and example introduction so they no longer claim that no service anywhere in the complete route can repeat.
- **The maximum-depth setting was called global.** `VAR_LENGTH_EXTEND_MAX_DEPTH` belongs to a connection and acts as both the omitted upper bound and a ceiling for explicit bounds on that connection. Changed “global” to “connection-wide.” Also changed the later `DISTINCT`/`LIMIT` example from 10 hops to 8 so it remains valid if read in sequence after the post's `CALL var_length_extend_max_depth=8` example.
- **The variants table could imply that `WALK` is a valid recursive-pattern modifier.** Kuzu 0.11.3 selects `WALK` by omitting a modifier; explicit `* WALK ...` syntax is rejected. Added “default; omit the modifier” to the table.
- **The optimizer statement assumed that `service_id` was a primary key without stating the condition.** Kuzu creates and uses its primary-key index only when that property is declared as the node table's primary key. Made that prerequisite explicit and retained the requirement that parameter values have the correct type.
- **The user-supplied depth guidance implied that a recursive bound could be passed as a query parameter.** Kuzu 0.11.3's recursive bounds are integer-literal grammar productions, and `*1..$depth` is rejected. Changed the guidance to validate depth outside Cypher and either select a prewritten bounded query or render only the validated integer literal, while continuing to parameterize ordinary data values. Clarified that the result-size cap is an application-level guardrail.

## Review Notes
- All Cypher forms shown in the corrected post were parsed and executed against the official `kuzu==0.11.3` Python package on an in-memory fixture containing cycles, multiple routes, filtered edges, and projected properties.
- Runtime tests confirmed that a three-edge cycle can satisfy `* ACYCLIC 3..3` because the source and destination are excluded from the recursive relationship's intermediate-node check, while `is_acyclic()` on the complete named path rejects that cycle.
- Runtime and tagged-source checks confirmed the default maximum depth of 30, the validity of `CALL var_length_extend_max_depth=8`, the rejection of explicit bounds above that connection's ceiling, and the rejection of parameters in recursive bounds.
- The default `WALK` behavior, `TRAIL`, `ACYCLIC`, `SHORTEST`, recursive filters, relationship/node projection order, `length()`, `nodes()`, `rels()`, `DISTINCT`, `LIMIT`, `EXPLAIN`, and `PROFILE` behavior are otherwise correct for Kuzu 0.11.3.
- Kuzu 0.11.3 can push a limit into some operators, including distinct aggregation, but that does not guarantee that a recursive traversal will avoid producing a large intermediate set before enough distinct results are found. The post's plan-dependent warning is accurate.
- The Kuzu repository and documentation are archived at the final v0.11.3 state. LadybugDB is maintained separately and identifies itself as formerly Kuzu, so its later behavior must not be assumed to match Kuzu 0.11.3.
- All external links in the post returned HTTP 200 during validation on 2026-08-12.
