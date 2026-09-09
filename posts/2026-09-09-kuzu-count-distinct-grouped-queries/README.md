# Rewrite COUNT DISTINCT Subqueries as Grouped Kuzu Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Cypher, Graph Database, Aggregation, Query Optimization

Description: Rewrite distinct-count workflows with explicit Kuzu grouping while preserving node identity, zero counts, and null semantics.

A correlated count can often be expressed as one graph match followed by grouping. The difficult part is preserving what the original query counted: relationships, distinct destination nodes, or distinct destination property values. Those are different quantities when the graph contains parallel edges, duplicate names, or nulls.

This tutorial targets Kuzu 0.11.3 and uses grouping in `WITH` and `RETURN`. It does not assume that every Neo4j subquery form is accepted by Kuzu. Start from the intended result and build a grouped query whose behavior you can verify on a small fixture.

## Establish the counting unit

Create three people and parallel relationships from Ada to Ben:

```cypher
CREATE NODE TABLE Person(id INT64 PRIMARY KEY, name STRING);
CREATE REL TABLE Knows(FROM Person TO Person);
CREATE (:Person {id: 1, name: 'Ada'});
CREATE (:Person {id: 2, name: 'Ben'});
CREATE (:Person {id: 3, name: 'Cara'});
MATCH (a:Person {id: 1}), (b:Person {id: 2})
CREATE (a)-[:Knows]->(b);
MATCH (a:Person {id: 1}), (b:Person {id: 2})
CREATE (a)-[:Knows]->(b);
```

Ada has two outgoing relationships but one distinct neighbor. Ben and Cara each have zero outgoing neighbors. If the desired output is one row per person, including zero counts, the target result is `(1,1), (2,0), (3,0)`.

Use a node primary key to identify a destination within a single node table. Counting distinct names merges people who happen to share a name. For a heterogeneous match across several node tables, a bare property value can collide across tables; group or count by node identity when the desired unit is the node itself.

## Replace a per-node distinct count

A grouped query expresses the complete result:

```cypher
MATCH (person:Person)
OPTIONAL MATCH (person)-[:Knows]->(neighbor:Person)
RETURN person.id AS id, count(DISTINCT neighbor.id) AS neighbor_count
ORDER BY id;
```

The non-aggregate expression `person.id` is the grouping key. `count(DISTINCT neighbor.id)` ignores the null destination generated for people with no match. Kuzu's [RETURN reference](https://kuzudb.github.io/docs/cypher/query-clauses/return/) describes this implicit grouping model.

Replacing `OPTIONAL MATCH` with a mandatory match removes people with no neighbors. Replacing the aggregate with `count(*)` counts the optional row for a person without neighbors, producing one instead of zero. Both are common rewrites that run successfully while changing the answer.

If the original workflow only includes people with at least one neighbor, a mandatory match is appropriate. State that requirement explicitly so a future maintainer does not add or remove optional matching as a performance tweak.

## Use WITH to filter aggregate results

When only people with at least two distinct neighbors qualify, group before filtering:

```cypher
MATCH (person:Person)
OPTIONAL MATCH (person)-[:Knows]->(neighbor:Person)
WITH person, count(DISTINCT neighbor.id) AS neighbor_count
WHERE neighbor_count >= 2
RETURN person.id AS id, neighbor_count
ORDER BY neighbor_count DESC, id;
```

The original fixture returns no rows. Add an edge from Ada to Cara and Ada should appear with a count of two. Adding another parallel edge to Ben must leave that count unchanged.

The grouping key is now `person`, allowing the final projection to access its properties. Grouping by `person.name` instead can combine two distinct people into one group. Choose a key that represents the entity whose result row you want.

## Deduplicate first when the intermediate set is useful

A two-stage form is sometimes clearer:

```cypher
MATCH (person:Person)
OPTIONAL MATCH (person)-[:Knows]->(neighbor:Person)
WITH DISTINCT person, neighbor
RETURN person.id AS id, count(neighbor) AS neighbor_count
ORDER BY id;
```

Here `DISTINCT` removes duplicate `(person, neighbor)` pairs. `count(neighbor)` still excludes the optional null. This form is useful when another downstream step consumes the distinct neighbor set, but it is not inherently faster than `count(DISTINCT ...)`. Compare plans and runtime on representative data.

Be careful adding columns to the distinct projection. `WITH DISTINCT person, neighbor, relationship.since` deduplicates triples, so several dates can restore multiple rows for the same neighbor. Distinctness applies to the complete projected row.

## Avoid multiplication across independent matches

Suppose a person has several purchases and several friends. Matching both patterns before aggregating can generate a product of those sets. Distinct counts may survive that multiplication, while sums and ordinary counts do not.

Aggregate the first expansion before starting the second:

```cypher
MATCH (person:Person)
OPTIONAL MATCH (person)-[:Knows]->(neighbor:Person)
WITH person, count(DISTINCT neighbor) AS outgoing
OPTIONAL MATCH (other:Person)-[:Knows]->(person)
RETURN person.id AS id, outgoing,
       count(DISTINCT other) AS incoming
ORDER BY id;
```

Each stage reduces its expansion to one row per person. This also exposes the intended grouping boundary to a reviewer. It does not guarantee a particular execution plan, so use `EXPLAIN` or `PROFILE` when evaluating performance.

## Validate semantic equivalence

Compare sorted results for an isolated node, parallel edges, shared destination names, and null destination properties. Test multiple source nodes with the same display name. If the original query filters neighbors, include a person whose only neighbors fail that filter and confirm whether the intended result is zero or no row.

Measure performance after these tests pass. A faster query that drops zero-count entities or merges distinct people is not an equivalent rewrite.

## Conclusion

Rewrite distinct counts around an explicit grouping unit. Preserve zero-count rows with optional matching, count the nullable matched value, and aggregate independent expansions separately before tuning execution.

## Official Documentation

- [RETURN and grouping](https://kuzudb.github.io/docs/cypher/query-clauses/return/)
- [WITH](https://kuzudb.github.io/docs/cypher/query-clauses/with/)
- [OPTIONAL MATCH](https://kuzudb.github.io/docs/cypher/query-clauses/optional-match/)
- [Cypher differences](https://kuzudb.github.io/docs/cypher/difference/)
