# Why Neo4j Cypher Does Not Run Unchanged in Kuzu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Neo4j, Cypher, Graph Database, Migration, Schema

Description: Port Neo4j Cypher to Kuzu by surfacing schema, path-semantic, clause, function, and type assumptions before they become production bugs.

---

Neo4j and Kuzu both speak Cypher, but “Cypher” is not a promise that every query, data model, function, or path result is interchangeable. Kuzu 0.11.3 follows openCypher where possible while making different choices around typed schemas, path semantics, loading syntax, supported clauses, and functions. A query can therefore fail at parse or bind time-or, more dangerously, run and return a different number of rows.

The productive migration strategy is to inventory assumptions instead of patching syntax errors one at a time. Freeze a representative Neo4j query suite, create an explicit Kuzu schema, port by difference category, and compare result invariants. Kuzu was archived in October 2025, so validate against the pinned 0.11.3 documentation and binary rather than assuming future convergence. LadybugDB is the maintained successor; its current compatibility surface has evolved and must not be silently treated as identical to frozen Kuzu.

## Difference 1: Kuzu Expects a Structured Schema

Traditional Neo4j workflows often create labeled nodes first and add constraints or indexes later. Kuzu's default model requires node and relationship tables before insertion. Every node table needs a primary key, properties have declared types, and relationship tables declare allowed `FROM` and `TO` node tables.

A Neo4j setup like this:

~~~cypher
CREATE CONSTRAINT person_id IF NOT EXISTS
FOR (p:Person) REQUIRE p.id IS UNIQUE;

CREATE (:Person {id: 'p1', name: 'Ada'});
~~~

becomes explicit Kuzu DDL followed by data manipulation:

~~~cypher
CREATE NODE TABLE Person(
    id STRING PRIMARY KEY,
    name STRING,
    born DATE
);

CREATE NODE TABLE Company(
    id STRING PRIMARY KEY,
    name STRING
);

CREATE REL TABLE WORKS_AT(
    FROM Person TO Company,
    since INT64
);

CREATE (:Person {id: 'p1', name: 'Ada'});
~~~

Neo4j's `IS UNIQUE` constraint permits `Person` nodes with no `id`; a Kuzu primary key is non-null as well as unique. Reject or supply missing IDs before import.

This changes more than syntax. Decide how Neo4j's optional or heterogeneous properties map to typed columns, which property is the durable primary key, and which label pairs each relationship may connect. Kuzu creates the node primary-key index; it does not accept arbitrary Neo4j index/constraint DDL unchanged.

Do not port Neo4j internal IDs as business identity. Define stable source keys and verify uniqueness before import.

## Difference 2: Specify Labels When Mutating

Kuzu recommends explicit node and relationship labels in `CREATE` and `MERGE`. It may infer a label from an unambiguous schema, but relying on inference makes a migration fragile as tables are added.

Prefer:

~~~cypher
MERGE (p:Person {id: $id})
ON CREATE SET p.name = $name
ON MATCH SET p.name = $name;
~~~

over an unlabeled pattern. For relationships, match typed endpoints and name the relationship table:

~~~cypher
MATCH (p:Person), (c:Company)
WHERE p.id = $person_id AND c.id = $company_id
MERGE (p)-[w:WORKS_AT]->(c)
ON CREATE SET w.since = $since;
~~~

Kuzu `MERGE` treats the entire pattern as the match-or-create unit; it does not partially match a complex pattern and fill in just the missing pieces. Match established nodes separately when that is the intended behavior.

## Difference 3: Variable-Length Paths Use Walk Semantics

This is the highest-risk semantic difference. By default, Neo4j uses relationship-unique (trail) semantics in `MATCH`: the same relationship cannot repeat within a matched graph pattern. Neo4j Cypher 25 can opt into repeated elements explicitly, while Kuzu's recursive relationship uses `WALK` by default, allowing nodes and relationships to repeat. A cyclic graph can therefore produce many more Kuzu rows for an apparently equivalent query.

Bound every traversal:

~~~cypher
MATCH (a:Person)-[:KNOWS*1..4]->(b:Person)
WHERE a.id = $start
RETURN b.id, count(*) AS path_count;
~~~

For the single recursive segment shown, when Neo4j-like no-repeated-edge behavior is required, request it explicitly:

~~~cypher
MATCH (a:Person)-[:KNOWS* TRAIL 1..4]->(b:Person)
WHERE a.id = $start
RETURN b.id;
~~~

For no repeated intermediate nodes, use `ACYCLIC`. Kuzu does not include the source and destination nodes in that recursive-relationship check; for no repeated nodes across the complete path, bind a named path and filter with `is_acyclic(p)`. The `is_trail(p)` predicate likewise checks a complete named path. Selecting the recursive semantic in the pattern can still avoid generating many unwanted walks in the first place.

Kuzu assigns a configured default maximum depth-30 in the archived documentation-if an upper bound is omitted. That prevents nontermination; it does not make an unbounded-looking production query selective or cheap. Express the business bound.

## Difference 4: Loading Is Not `LOAD CSV FROM`

Kuzu can scan CSV, Parquet, JSON, DataFrames, and other sources, so its scanning clause is `LOAD FROM`, not Neo4j's `LOAD CSV FROM`. To persist a large dataset into node or relationship tables, use `COPY FROM`:

~~~cypher
COPY Person FROM 'person.parquet';
COPY Company FROM 'company.parquet';
COPY WORKS_AT FROM 'works-at.parquet';
~~~

Load node tables before relationships because relationship rows resolve endpoint primary keys. `LOAD FROM` is useful for scanning or transforming source data without immediately inserting it:

~~~cypher
LOAD FROM 'person.csv'
WHERE active = true
RETURN id, name;
~~~

Do not mechanically rewrite a Neo4j `LOAD CSV` loop into a row-by-row Kuzu `MERGE` loop for millions of records. Normalize and deduplicate upstream, then use Kuzu's bulk path.

## Difference 5: Some Clauses Need Rewrites

The archived Kuzu difference guide calls out several incompatibilities:

- `FOREACH` is unsupported; express list-driven work with `UNWIND`.
- `REMOVE n.prop` becomes `SET n.prop = NULL`.
- `CALL { ... }` subqueries are unsupported, although `EXISTS` and `COUNT` subqueries are available.
- Neo4j `SHOW ...` commands generally map to Kuzu table functions such as `CALL show_tables() RETURN *`.
- Pattern-local node predicates such as `(n:Person WHERE n.age > 30)` move to a separate `WHERE` clause.
- A label predicate such as `WHERE n:Person` should become a labeled pattern or `label(n) = 'Person'` where appropriate.

For example, rewrite a list update:

~~~cypher
UNWIND $people AS row
MERGE (p:Person {id: row.id})
ON CREATE SET p.name = row.name
ON MATCH SET p.name = row.name;
~~~

Test every rewrite for multiplicity. `UNWIND`, `OPTIONAL MATCH`, and aggregation can change row counts when moved across query boundaries.

## Difference 6: Functions and Types Differ

Build a compatibility map for every nontrivial Neo4j function used by the application. Documented examples include:

| Neo4j expression | Kuzu direction |
| --- | --- |
| `labels(n)` | `label(n)` returns one `STRING`, not Neo4j's `LIST<STRING>`, because a Kuzu node has one table label |
| `elementId(n)` | `id(n)` returns Kuzu's `INTERNAL_ID`, not Neo4j's `STRING`; neither is durable identity |
| `toInteger(x)` | `cast(x, 'INT64')` or an equivalent typed cast |
| `head(xs)` | `list_extract(xs, 1)` or list indexing; guard empty lists because Kuzu raises instead of returning `NULL` |
| `tail(xs)` | `list_slice(xs, 2, size(xs))` |
| `timestamp()` | `to_epoch_ms(current_timestamp())` for Neo4j's epoch-millisecond integer; `current_timestamp()` itself returns a `TIMESTAMP` |
| cosine similarity function | `array_cosine_similarity(...)` |

These are migration directions, not always drop-in equivalents. For example, Neo4j `toInteger()` accepts booleans and returns `NULL` when a supported input cannot be parsed, whereas Kuzu cannot cast `BOOL` to `INT64` and raises a conversion error for an invalid numeric string. Validate input and conversion behavior explicitly when it matters.

Kuzu follows a strict typing model. Lists must have a consistent element type, and property assignments must fit declared columns. A Neo4j property that sometimes contains a string and sometimes a number needs a migration decision, not a clever cast sprinkled through every query.

Spatial functions and some mathematical or temporal conveniences are not present in frozen Kuzu. Fail such features explicitly during migration planning rather than discovering them after cutover.

## Difference 7: Aggregation Has Implicit Grouping

Like Cypher generally, Kuzu does not use an explicit SQL `GROUP BY`. Non-aggregated expressions in the `RETURN` or `WITH` projection determine grouping. While this often ports directly, query rewrites can accidentally add a grouping key:

~~~cypher
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN c.id, count(*) AS work_relationships;
~~~

If a port also returns `p.name`, it groups by company ID and person name rather than just company ID. Validate result schemas and uniqueness, not merely whether the query executes.

## Use a Migration Harness

For every production query, record:

1. Query name and parameter fixture.
2. Neo4j result column names and types.
3. Row count and uniqueness keys.
4. Stable ordered values where ordering is specified.
5. Aggregate invariants when complete row comparison is impractical.
6. Expected error behavior for invalid input.
7. Maximum traversal depth and intended path semantic.

Run the same logical fixture in both databases. Add explicit `ORDER BY` before comparing sequences; without it, neither engine owes the same row order. Never compare internal IDs across systems.

Also profile the Kuzu form. A correct rewrite may expose a schema or join-order assumption that performs poorly. Use `EXPLAIN` to inspect the planned operators and `PROFILE` on safe representative data to see runtime counts and time.

## Official Documentation

- [Kuzu archive notice and 0.11.3 status](https://github.com/kuzudb/kuzu)
- [Kuzu differences from Neo4j](https://kuzudb.github.io/docs/cypher/difference/)
- [Kuzu Cypher manual](https://kuzudb.github.io/docs/cypher/)
- [Kuzu table DDL](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu `MATCH` and recursive relationship semantics](https://kuzudb.github.io/docs/cypher/query-clauses/match/)
- [Kuzu data import](https://kuzudb.github.io/docs/import/)
- [Kuzu functions and expressions](https://kuzudb.github.io/docs/cypher/expressions/)
- [LadybugDB current Neo4j compatibility guide](https://docs.ladybugdb.com/cypher/difference/)

## Conclusion

Neo4j Cypher is a strong starting point for Kuzu, not a drop-in contract. Model the graph as typed node and relationship tables, replace loading and unsupported clauses deliberately, map functions and types, and make path semantics explicit. The critical test is not “did it parse?” but “did it preserve identity, multiplicity, path rules, and performance?” A fixture-based migration harness turns those assumptions into evidence before frozen Kuzu 0.11.3 reaches production.
