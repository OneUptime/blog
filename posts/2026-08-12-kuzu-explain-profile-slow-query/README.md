# A Kuzu Query Is Slow: Reading `EXPLAIN`/`PROFILE`, Bounding Paths, and Checking Join Order

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Graph Database, Cypher, Query Performance, Profiling, Query Plan

Description: Diagnose slow Kuzu Cypher with plans, runtime operator evidence, bounded traversals, cardinality checks, and carefully validated join-order hints.

---

When a Kuzu query is slow, begin with two different questions: what plan did the optimizer choose, and where did the executed plan actually spend time or do disproportionate work? `EXPLAIN` answers the first without running the query. `PROFILE` runs it and annotates physical operators with runtime information. Use them in that order, on a controlled copy when the query can be expensive.

Kuzu is archived at 0.11.3, so keep the query text, dataset snapshot, engine version, thread configuration, and plan output together. Plan behavior from a newer LadybugDB release may illuminate the engine lineage but is not proof of what frozen Kuzu executes.

## Reproduce Before Tuning

Capture a minimal performance case:

- Exact Cypher text, including labels, directions, bounds, `ORDER BY`, and `LIMIT`.
- Exact parameter values and types.
- Kuzu version from `CALL db_version() RETURN *`.
- Node and relationship counts plus important degree distributions.
- Cold versus warm run and connection thread setting.
- Compile time, execution time, returned rows, and rows consumed by the client.

Do not benchmark a query in a UI that renders 100,000 nodes and call all elapsed time “Kuzu.” Consume or aggregate the result consistently. Conversely, a client that never drains the result may understate end-to-end work.

Use a representative parameter, not the easiest ID in the graph. A plan that is fine for a degree-2 account can collapse for a degree-500,000 hub.

## `EXPLAIN`: Inspect the Chosen Work

Prefix the statement:

~~~cypher
EXPLAIN
MATCH (p:Person)-[:PURCHASED]->(o:`Order`)-[:CONTAINS]->(i:Item)
WHERE p.person_id = $person_id
  AND o.placed_at >= $since
RETURN i.category, count(*) AS purchases
ORDER BY purchases DESC
LIMIT 20;
~~~

`EXPLAIN` compiles and prints the plan but does not execute it; timing fields are therefore zero. Read from the leaves toward the result collector and ask:

1. Where does the plan begin—at the selective person key, all people, recent orders, or items?
2. Are labels and relationship directions specific enough to select the intended tables?
3. When are predicates applied?
4. Which operators expand relationships or join intermediate records?
5. Where do aggregation, sorting, and limiting occur?
6. Does a variable-length operator have a small explicit bound?

Operator names can vary by query and version. Focus on dataflow rather than memorizing one plan's box labels. A scan producing a large stream before the first useful filter is a strong lead; it is not automatically a bug, because later joins and semi-mask optimizations can change the real cost.

## `PROFILE`: Find Actual Expansion

Run the same query with `PROFILE` only when it is safe to execute:

~~~cypher
PROFILE
MATCH (p:Person)-[:PURCHASED]->(o:`Order`)-[:CONTAINS]->(i:Item)
WHERE p.person_id = $person_id
  AND o.placed_at >= $since
RETURN i.category, count(*) AS purchases
ORDER BY purchases DESC
LIMIT 20;
~~~

The profile includes the plan plus execution time and output-tuple information for operators. Treat `NumOutputTuples` as an operator-local work clue, not as a uniform logical-row count: Kuzu's vectorized, factorized operators do not all count output the same way. Corroborate a suspected expansion with the operator shape and final result cardinality rather than comparing adjacent counters mechanically. A downstream aggregate may be expensive only because an earlier expansion did disproportionate work.

Useful diagnoses include:

- A node scan stays large because the predicate is not selective or was expressed in a form the plan cannot exploit.
- A relationship extension multiplies rows because the start node is a hub.
- Two disconnected patterns without a join predicate form an unintended Cartesian product.
- A variable-length traversal enumerates many walks that are later deduplicated.
- Sorting receives a huge input because aggregation or filtering happens too late.
- Returning full nodes, relationships, or path properties carries much more data than scalar IDs.

`PROFILE` itself adds measurement work and executes writes if prefixed to a mutating statement. Do not casually profile production mutations.

## Bound Recursive Relationships

Kuzu uses `WALK` semantics by default for recursive relationships: nodes and edges may repeat. An omitted upper bound falls back to the connection's `VAR_LENGTH_EXTEND_MAX_DEPTH`, which defaults to 30 and is a safety ceiling, not a sensible application query.

Replace this:

~~~cypher
MATCH (a:Service)-[:DEPENDS_ON*]->(b:Service)
WHERE a.service_id = $service_id
RETURN DISTINCT b.service_id;
~~~

with a business bound and intended path semantic:

~~~cypher
MATCH (a:Service)-[:DEPENDS_ON* ACYCLIC 1..6]->(b:Service)
WHERE a.service_id = $service_id
RETURN DISTINCT b.service_id;
~~~

`TRAIL` prohibits repeated relationships; `ACYCLIC` prohibits repeated nodes within the recursive relationship. Neither cures a dense graph by itself. If the actual requirement is nearest reachability, use the documented shortest-path form rather than enumerating all paths and sorting by length afterward:

~~~cypher
MATCH (a:Service)-[r:DEPENDS_ON* SHORTEST 1..6]->(b:Service)
WHERE a.service_id = $service_id
RETURN b.service_id, length(r);
~~~

Push supported predicates into the recursive relationship when they genuinely prune intermediate edges or nodes:

~~~cypher
MATCH (a:Service)-[r:DEPENDS_ON*1..6
    (e, n | WHERE e.active = true AND n.retired = false)
]->(b:Service)
WHERE a.service_id = $service_id
RETURN b.service_id;
~~~

Validate syntax and supported predicate shapes against Kuzu 0.11.3; complex expressions involving both variables are more restricted than an arbitrary post-filter.

## Check Cardinality and Query Shape

Before forcing join order, measure the inputs. Useful queries include:

~~~cypher
MATCH (p:Person) RETURN count(*) AS people;

MATCH (p:Person)-[:PURCHASED]->(o:`Order`)
WHERE p.person_id = $person_id
RETURN count(*) AS orders_for_person;

MATCH (o:`Order`)-[:CONTAINS]->(i:Item)
WHERE o.placed_at >= $since
RETURN count(*) AS recent_lines;
~~~

For skew, aggregate degree and inspect percentiles outside the hot query or return a manageable distribution summary. A single global average hides hubs.

Keep connected patterns connected. This query expresses a property join between two otherwise disconnected scans:

~~~cypher
MATCH (p:Person), (i:Item)
WHERE p.country = i.origin_country
RETURN count(*);
~~~

Kuzu can plan this equality as a hash join, but it may still scan both sides, and repeated property values can produce many matches. If a relationship represents the association, express it. If a property join really is intended, understand that both sides may be large.

Return only what the caller uses. `RETURN path` materializes nodes and relationships; `RETURN b.service_id` is much smaller. Add deterministic pagination or aggregation rather than relying on a UI result cap. A final `LIMIT` does not necessarily prevent upstream path enumeration, especially when sorting or aggregation requires seeing all candidates.

## Primary Keys and Predicate Shape

Kuzu automatically indexes each node table's declared primary key. Starting from an equality filter on that key is often an excellent anchor:

~~~cypher
MATCH (p:Person)-[:PURCHASED]->(o:`Order`)
WHERE p.person_id = $person_id
RETURN o.order_id;
~~~

Kuzu 0.11.3 does not offer arbitrary user-created indexes for every property in the Neo4j style. If most hot queries begin from a different unique identity, revisit the schema rather than assuming an index hint will fix it. Do not cast the primary-key column or wrap it in a transformation without checking the plan; normalize the parameter to the column's declared type in the client.

## Join Order: Hint Last

Kuzu includes a `HINT` clause for experimental use or genuinely suboptimal optimizer choices. A join-order hint names every node and relationship variable in a connected `MATCH` pattern exactly once and expresses the order as a binary tree.

Suppose the destination company is uniquely filtered:

~~~cypher
MATCH (p:Person)-[w:WORKS_AT]->(c:Company)
WHERE c.company_id = $company_id
RETURN p.person_id;
~~~

A hint that starts from the selective destination and scans backward can be expressed in the documented form:

~~~cypher
MATCH (p:Person)-[w:WORKS_AT]->(c:Company)
WHERE c.company_id = $company_id
HINT p JOIN (w JOIN c)
RETURN p.person_id;
~~~

Do not cargo-cult that hint. First prove with `PROFILE` that the unhinted plan is poor, and test low-, median-, and high-cardinality parameter values. A hint freezes knowledge about current data distribution and can age badly. Store the before/after plans and benchmark with the query so a future schema or dataset change can invalidate the exception consciously.

For cyclic patterns, Kuzu can use worst-case-optimal multi-join operators; the official hint guide documents `MULTI_JOIN`. That is specialist tuning. Prefer a faithful connected pattern and current statistics unless a reproducible profile justifies manual control.

## A Repeatable Troubleshooting Loop

1. Reproduce with pinned data, parameters, version, and threads.
2. Capture `EXPLAIN` and identify scans, expansions, joins, aggregation, sort, and limit.
3. Capture a safe `PROFILE` and use operator-local tuple counters to locate disproportionate work.
4. Make path bounds and semantics explicit.
5. Remove unintended cross products and oversized projections.
6. Anchor from a selective typed primary key when the data model supports it.
7. Change one item, then compare rows and runtime.
8. Use `HINT` only after the optimizer choice is demonstrably the remaining cause.
9. Add the worst representative parameter to a performance regression suite.

Correctness comes before speed: compare row counts, uniqueness, aggregates, and stable result samples after every rewrite.

## Official Documentation

- [Kuzu 0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu performance debugging with `EXPLAIN` and `PROFILE`](https://kuzudb.github.io/docs/developer-guide/performance-debugging/)
- [Kuzu `MATCH` and recursive relationships](https://kuzudb.github.io/docs/cypher/query-clauses/match/)
- [Kuzu join-order hints](https://kuzudb.github.io/docs/developer-guide/join-order-hint/)
- [Kuzu configuration, including threads and recursive depth](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu table and primary-key DDL](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [LadybugDB maintained performance debugging guide](https://docs.ladybugdb.com/developer-guide/performance-debugging/)

## Conclusion

Treat a slow Kuzu query as a dataflow problem. `EXPLAIN` shows the intended work; `PROFILE` reveals where operator-local work and time accumulate. Bound recursive patterns, select `WALK`, `TRAIL`, `ACYCLIC`, or shortest-path semantics intentionally, anchor from selective schema-backed identities, and keep result projections small. Only then consider a join-order hint—and preserve the profile that proves why it exists.
