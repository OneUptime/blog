# Why Did a Variable-Length Kuzu Traversal Explode in Rows and Memory?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Graph Database, Cypher, Graph Traversal, Memory, Query Performance

Description: Stop Kuzu recursive traversals from enumerating explosive numbers of walks by bounding depth, choosing path semantics, pruning early, and returning only required data.

---

A variable-length Kuzu traversal usually explodes because the query asks for paths, not merely reachable endpoints, and Kuzu's default recursive semantic is `WALK`. A walk may revisit both nodes and relationships. On a cyclic or high-degree graph, the same destination can therefore be reached through a rapidly growing number of edge sequences. `DISTINCT` at the end removes duplicate output values only after much of that work has already happened.

The fix is to define the real question precisely: maximum depth, allowed edge labels and directions, whether edges or nodes may repeat, whether every path is required, which intermediate predicates apply, and whether the caller needs path contents at all. Kuzu is frozen at 0.11.3, so verify syntax and behavior against that release rather than a later successor build.

## Why the Row Count Grows So Fast

Consider a service dependency graph with an average outward degree of 10. A rough upper-bound intuition for unconstrained walk candidates is:

~~~text
depth 1:       10
depth 2:      100
depth 3:    1,000
depth 4:   10,000
depth 5:  100,000
~~~

Real graphs have overlap and skew, so this is not an exact estimator. It shows why “just two more hops” is not a small change. A hub can be worse than the average, and cycles let later depths revisit earlier graph regions.

This query asks Kuzu to enumerate every matching walk from one service through one to eight dependencies:

~~~cypher
MATCH (a:Service)-[r:DEPENDS_ON*1..8]->(b:Service)
WHERE a.service_id = $service_id
RETURN b.service_id;
~~~

If 50,000 walks end at 2,000 distinct services, Kuzu still has 50,000 path matches before any final deduplication. Returning `r` is heavier: a recursive relationship is represented with lists of intermediate nodes and relationships, so longer and more numerous matches carry more memory.

## Never Rely on the Implicit Maximum

Kuzu requires a recursive traversal to terminate. When the query omits the upper bound, archived documentation says Kuzu uses the `VAR_LENGTH_EXTEND_MAX_DEPTH` setting, whose default is 30:

~~~cypher
MATCH (a:Service)-[:DEPENDS_ON*]->(b:Service)
RETURN b.service_id;
~~~

Thirty is a safety limit, not a recommended business radius. On a cyclic production graph it is enormous. State the bound in the query:

~~~cypher
MATCH (a:Service)-[:DEPENDS_ON*1..4]->(b:Service)
WHERE a.service_id = $service_id
RETURN DISTINCT b.service_id;
~~~

The connection setting can add a defense-in-depth ceiling:

~~~cypher
CALL var_length_extend_max_depth=8;
~~~

Do not use the global setting as a substitute for query intent. A reviewer should see that an impact analysis is four hops because the domain says so.

## Choose `WALK`, `TRAIL`, or `ACYCLIC`

Kuzu supports three relevant recursive semantics:

- `WALK`, the default, allows repeated nodes and relationships.
- `TRAIL` requires relationships in the recursive relationship to be distinct.
- `ACYCLIC` requires its nodes to be distinct.

If revisiting the same dependency edge is meaningless, make that explicit:

~~~cypher
MATCH (a:Service)-[r:DEPENDS_ON* TRAIL 1..6]->(b:Service)
WHERE a.service_id = $service_id
RETURN b.service_id, length(r);
~~~

If no service may appear twice within a route:

~~~cypher
MATCH (a:Service)-[r:DEPENDS_ON* ACYCLIC 1..6]->(b:Service)
WHERE a.service_id = $service_id
RETURN b.service_id, length(r);
~~~

These semantics reduce invalid repetition; they do not guarantee a small answer. A dense acyclic graph can contain a vast number of simple paths. Also note Kuzu's documented distinction between an `ACYCLIC` recursive relationship and applying `is_acyclic()` to a complete named path: endpoint treatment differs. Test the exact form your application uses.

## Ask for Shortest Paths When That Is the Question

Do not enumerate every route and then select the minimum length in application code. Kuzu provides shortest-path forms on recursive relationships:

~~~cypher
MATCH (a:Service)-[r:DEPENDS_ON* SHORTEST 1..8]->(b:Service)
WHERE a.service_id = $service_id
RETURN b.service_id, length(r) AS hops;
~~~

Use `ALL SHORTEST` only when all equal-length shortest routes are required. “Find affected services and their minimum distance” is a different, usually smaller problem from “return every dependency path.” Encode the former directly.

For a specific destination, filter both endpoints:

~~~cypher
MATCH (a:Service)-[r:DEPENDS_ON* SHORTEST 1..8]->(b:Service)
WHERE a.service_id = $source
  AND b.service_id = $destination
RETURN length(r) AS hops;
~~~

Typed primary-key predicates give the optimizer selective anchors and avoid scanning every possible start.

## Prune Inside the Recursive Expansion

A final `WHERE` condition on the destination cannot necessarily prevent exploration through unwanted intermediate records. Kuzu's recursive relationship syntax supports predicates on intermediate relationships and nodes:

~~~cypher
MATCH (a:Service)-[r:DEPENDS_ON*1..6
    (edge, node |
        WHERE edge.active = true
          AND node.environment = $environment)
]->(b:Service)
WHERE a.service_id = $service_id
RETURN DISTINCT b.service_id;
~~~

This permits the traversal to reject inactive edges and wrong-environment intermediate nodes during expansion. The archived Kuzu grammar restricts these filters: documented forms include a predicate on the node, a predicate on the relationship, or a conjunction of those. Arbitrary cross-variable Boolean logic is not automatically supported. Keep the expression within the documented 0.11.3 surface and test it.

Also constrain relationship labels and direction. `-[*1..4]-` over any relationship in either direction searches a much larger space than `-[:DEPENDS_ON*1..4]->`.

## Return Less Path State

If the application needs reachable IDs, return IDs:

~~~cypher
MATCH (a:Service)-[:DEPENDS_ON* TRAIL 1..5]->(b:Service)
WHERE a.service_id = $service_id
RETURN DISTINCT b.service_id;
~~~

Avoid `RETURN *`, full path variables, or all intermediate properties. When a path is needed, Kuzu can project only selected properties from intermediate relationships and nodes inside the recursive pattern. The archived `MATCH` guide documents property projection with two brace lists. For example:

~~~cypher
MATCH (a:Service)-[r:DEPENDS_ON* TRAIL 1..5
    (edge, node | WHERE edge.active = true | {edge.kind}, {node.service_id})
]->(b:Service)
WHERE a.service_id = $service_id
RETURN nodes(r), rels(r);
~~~

Validate the exact syntax with 0.11.3 and project only what downstream code reads. Carrying large descriptions, JSON blobs, or embeddings for every intermediate node multiplies the footprint of an already multiplicative result.

## `DISTINCT` and `LIMIT` Are Not Early Pruning Guarantees

This looks safe but may remain expensive:

~~~cypher
MATCH (a:Service)-[:DEPENDS_ON*1..10]->(b:Service)
WHERE a.service_id = $service_id
RETURN DISTINCT b.service_id
LIMIT 100;
~~~

`DISTINCT` requires deduplication, and `LIMIT` controls returned tuples. Depending on the plan, neither prevents the recursive operator from producing a large intermediate set. Use `EXPLAIN` to inspect the plan, then `PROFILE` on controlled representative data to see operator output counts and time.

If the product genuinely needs only 100 arbitrary reachable endpoints, define deterministic selection and test whether a different query or application-side frontier algorithm better expresses that requirement. If it needs complete reachability, a low `LIMIT` is wrong regardless of speed.

## Diagnose With Counts Before Paths

Start with progressively wider bounds and aggregate instead of materializing paths:

~~~cypher
PROFILE
MATCH (a:Service)-[r:DEPENDS_ON* TRAIL 1..3]->(b:Service)
WHERE a.service_id = $service_id
RETURN count(*) AS paths,
       count(DISTINCT b.service_id) AS endpoints;
~~~

Compare bounds 1, 2, 3, and 4. A widening gap between paths and endpoints is direct evidence of multiple route enumeration. Repeat for a typical start node and known hubs.

Then test semantic variants using the same fixture:

| Variant | What it answers |
| --- | --- |
| `WALK` | Edge sequences with repetition allowed |
| `TRAIL` | Routes without a repeated relationship |
| `ACYCLIC` | Routes without a repeated intermediate node |
| `SHORTEST` | A shortest route to each matching endpoint |
| Endpoint-only projection | Reachability rather than route content |

Compare correctness before performance. Fewer rows are only an improvement when they are the intended rows.

## Put Guardrails Around User-Driven Traversal

If an API accepts traversal depth, validate it outside Cypher and pass it only through a supported parameter position. Enforce a server-side maximum, query timeout, and result-size limit. Separate an interactive “nearby graph” endpoint from an offline exhaustive path-analysis job.

Monitor execution time, returned rows, timeouts, and the source node's observed degree. Include cyclic and hub-heavy fixtures in regression tests. A tiny tree-shaped development graph cannot expose walk explosion.

## Official Documentation

- [Kuzu 0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu `MATCH`, recursive semantics, filters, and projections](https://kuzudb.github.io/docs/cypher/query-clauses/match/)
- [Kuzu recursive relationship functions](https://kuzudb.github.io/docs/cypher/expressions/recursive-rel-functions/)
- [Kuzu configuration and maximum recursive depth](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu performance debugging](https://kuzudb.github.io/docs/developer-guide/performance-debugging/)
- [Kuzu differences from Neo4j path semantics](https://kuzudb.github.io/docs/cypher/difference/)
- [LadybugDB maintained `MATCH` reference](https://docs.ladybugdb.com/cypher/query-clauses/match/)

## Conclusion

Variable-length traversal is combinatorial by nature, and Kuzu's default `WALK` semantics make repetition explicit. Prevent explosions by using a small business bound, the correct `TRAIL` or `ACYCLIC` rule, shortest-path syntax when only minimum distance matters, selective endpoints, in-expansion filters, and narrow projections. Profile the first tuple explosion and measure paths versus distinct endpoints. A final `DISTINCT` or `LIMIT` cannot repair a traversal that asked Kuzu to generate the wrong search space.
